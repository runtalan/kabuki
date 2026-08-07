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

  // Directly exercise the hand-written `!householdUserIds.includes(...)`
  // ownership checks added to accounts/[id], transactions/[id], etc. —
  // simulates what those routes do without needing a real HTTP session
  // (NextAuth here is Google-OAuth-only, so scripted login isn't possible).
  const { accounts } = await import('@/db/schema');
  const claudiaCheckingAccount = await db.query.accounts.findFirst({
    where: eq(accounts.id, 'seed-acct-claudia-checking'),
    with: { plaidItem: true },
  });
  const renatoCheckingAccount = await db.query.accounts.findFirst({
    where: eq(accounts.id, 'seed-acct-renato-checking'),
    with: { plaidItem: true },
  });
  if (!claudiaCheckingAccount || !renatoCheckingAccount) {
    throw new Error('Seeded checking accounts missing');
  }

  const renatoHousehold = await getHouseholdUserIds(renato.id);
  if (!renatoHousehold.includes(claudiaCheckingAccount.plaidItem.userId)) {
    throw new Error('Ownership check would wrongly reject Renato editing Claudia\'s account');
  }
  if (!renatoHousehold.includes(renatoCheckingAccount.plaidItem.userId)) {
    throw new Error('Ownership check would wrongly reject Renato editing his own account');
  }
  const demoHousehold = await getHouseholdUserIds(demo.id);
  if (demoHousehold.includes(claudiaCheckingAccount.plaidItem.userId)) {
    throw new Error('Ownership check would wrongly let demo touch Claudia\'s account');
  }
  console.log('  ok: single-resource ownership checks (accounts/[id]-style) behave correctly');

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
