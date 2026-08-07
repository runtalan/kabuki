// Run with: npx tsx scripts/verify-apple-card-balance-reset.ts
// Requires the local sandbox DB to already be seeded (npm run db:seed)
// and migration 0026 applied.
import { db } from '@/db';
import { accounts, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { resetStaleMonthlyBalances } from '@/lib/balance-reset';

async function main() {
  const renato = await db.query.users.findFirst({ where: eq(users.username, 'renato') });
  if (!renato) throw new Error('Seed data missing — run `npm run db:seed` first.');

  const appleCard = await db.query.accounts.findFirst({
    where: eq(accounts.name, 'Apple Card'),
  });
  if (!appleCard) throw new Error('No Apple Card account in sandbox — generate a token via Settings first.');

  // 1. Freshly created/migrated account: balanceMonth null -> no reset.
  await db.update(accounts).set({ currentBalance: '-42.50', balanceMonth: null }).where(eq(accounts.id, appleCard.id));
  await resetStaleMonthlyBalances(renato.id);
  let after = await db.query.accounts.findFirst({ where: eq(accounts.id, appleCard.id) });
  if (after?.currentBalance !== '-42.50') {
    throw new Error(`Expected null balanceMonth to be left alone, got currentBalance=${after?.currentBalance}`);
  }
  console.log('  ok: null balanceMonth is not treated as stale');

  // 2. Stale month -> reset to 0.
  await db.update(accounts).set({ currentBalance: '-42.50', balanceMonth: '2020-01' }).where(eq(accounts.id, appleCard.id));
  await resetStaleMonthlyBalances(renato.id);
  after = await db.query.accounts.findFirst({ where: eq(accounts.id, appleCard.id) });
  const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  if (after?.currentBalance !== '0.00' && after?.currentBalance !== '0') {
    throw new Error(`Expected stale balance to reset to 0, got ${after?.currentBalance}`);
  }
  if (after?.balanceMonth !== thisMonth) {
    throw new Error(`Expected balanceMonth to advance to ${thisMonth}, got ${after?.balanceMonth}`);
  }
  console.log('  ok: stale balanceMonth resets currentBalance to 0 and advances balanceMonth');

  // 3. Current month already -> no-op (balance untouched).
  await db.update(accounts).set({ currentBalance: '-10.00', balanceMonth: thisMonth }).where(eq(accounts.id, appleCard.id));
  await resetStaleMonthlyBalances(renato.id);
  after = await db.query.accounts.findFirst({ where: eq(accounts.id, appleCard.id) });
  if (after?.currentBalance !== '-10.00') {
    throw new Error(`Expected current-month balance to be left alone, got ${after?.currentBalance}`);
  }
  console.log('  ok: current-month balanceMonth is a no-op');

  console.log('balance-reset.ts: all checks passed');
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
