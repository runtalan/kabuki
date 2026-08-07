// Run with: npx tsx scripts/verify-household-scoping.ts
// Requires the local sandbox DB to already be seeded (npm run db:seed).
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getHouseholdUserIds } from '@/lib/household';

async function main() {
  const renato = await db.query.users.findFirst({ where: eq(users.username, 'renato') });
  const claudia = await db.query.users.findFirst({ where: eq(users.username, 'claudia') });
  const demo = await db.query.users.findFirst({ where: eq(users.username, 'demo') });
  if (!renato || !claudia || !demo) {
    throw new Error('Seed data missing — run `npm run db:seed` against the sandbox DB first.');
  }

  const fromRenato = new Set(await getHouseholdUserIds(renato.id));
  const fromClaudia = new Set(await getHouseholdUserIds(claudia.id));
  const fromDemo = new Set(await getHouseholdUserIds(demo.id));

  assertEqual(fromRenato, new Set([renato.id, claudia.id]), 'renato -> household');
  assertEqual(fromClaudia, new Set([renato.id, claudia.id]), 'claudia -> household');
  assertEqual(fromDemo, new Set([demo.id]), 'demo -> isolated');

  const { getUserAccounts, getSpendingByCategory } = await import('@/lib/queries');

  const renatoAccounts = await getUserAccounts(renato.id);
  const claudiaAccounts = await getUserAccounts(claudia.id);
  const renatoNames = new Set(renatoAccounts.map((a) => a.name));
  const claudiaNames = new Set(claudiaAccounts.map((a) => a.name));

  if (!renatoNames.has('Claudia Checking')) {
    throw new Error('getUserAccounts(renato.id) should include Claudia\'s seeded checking account');
  }
  if (!claudiaNames.has('Renato Checking')) {
    throw new Error('getUserAccounts(claudia.id) should include Renato\'s seeded checking account');
  }
  console.log('  ok: getUserAccounts is household-wide in both directions');

  const demoAccounts = await getUserAccounts(demo.id);
  if (demoAccounts.some((a) => a.name === 'Claudia Checking' || a.name === 'Renato Checking')) {
    throw new Error('getUserAccounts(demo.id) leaked real household accounts');
  }
  console.log('  ok: getUserAccounts stays isolated for the demo account');

  await getSpendingByCategory(renato.id); // smoke test — must not throw
  console.log('  ok: getSpendingByCategory(renato.id) runs without error');

  console.log('household.ts: all checks passed');
}

function assertEqual(actual: Set<string>, expected: Set<string>, label: string) {
  const a = [...actual].sort().join(',');
  const e = [...expected].sort().join(',');
  if (a !== e) throw new Error(`${label}: expected [${e}], got [${a}]`);
  console.log(`  ok: ${label}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
