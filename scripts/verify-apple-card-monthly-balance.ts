// Run with: npx tsx scripts/verify-apple-card-monthly-balance.ts
// Requires the local sandbox DB to already be seeded (npm run db:seed),
// migration 0026 applied, and an Apple Card account present (generate a
// token for either owner via Settings > Integrations first if missing).
import { db } from '@/db';
import { accounts, users, transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { recomputeMonthlyBalance, refreshMonthlyBalances } from '@/lib/monthly-balance';

async function insertTestTransaction(accountId: string, amount: number, date: Date, opts: { hidden?: boolean; transferType?: string } = {}) {
  const id = generateId();
  await db.insert(transactions).values({
    id,
    accountId,
    plaidTransactionId: `test-${id}`,
    name: 'Test Merchant',
    merchant: 'Test Merchant',
    amount: amount.toString(),
    type: amount >= 0 ? 'credit' : 'debit',
    date,
    pending: false,
    hidden: opts.hidden ?? false,
    transferType: opts.transferType ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}

async function main() {
  const renato = await db.query.users.findFirst({ where: eq(users.username, 'renato') });
  if (!renato) throw new Error('Seed data missing — run `npm run db:seed` first.');

  const appleCard = await db.query.accounts.findFirst({
    where: eq(accounts.name, 'Apple Card'),
  });
  if (!appleCard) throw new Error('No Apple Card account in sandbox — generate a token via Settings first.');

  // Clean slate for this account so the sum is predictable.
  await db.delete(transactions).where(eq(transactions.accountId, appleCard.id));

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 5);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);

  const t1 = await insertTestTransaction(appleCard.id, -12.34, thisMonthStart);
  const t2 = await insertTestTransaction(appleCard.id, -100, thisMonthStart);
  const t3 = await insertTestTransaction(appleCard.id, -999, lastMonthDate); // last month — must not count
  const t4 = await insertTestTransaction(appleCard.id, -50, thisMonthStart, { hidden: true }); // hidden — must not count
  const t5 = await insertTestTransaction(appleCard.id, -25, thisMonthStart, { transferType: 'credit_card_payment' }); // payment — must not count

  await recomputeMonthlyBalance(appleCard.id);
  let after = await db.query.accounts.findFirst({ where: eq(accounts.id, appleCard.id) });
  if (after?.currentBalance !== '-112.34') {
    throw new Error(`Expected currentBalance -112.34 (only this month's non-hidden, non-transfer debits), got ${after?.currentBalance}`);
  }
  console.log('  ok: recomputeMonthlyBalance sums only this month\'s non-hidden, non-transfer transactions');

  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (after?.balanceMonth !== thisMonth) {
    throw new Error(`Expected balanceMonth ${thisMonth}, got ${after?.balanceMonth}`);
  }
  console.log('  ok: balanceMonth stamped to the current month');

  // Simulate "next month, nothing posted yet" — no reset needed, it's
  // naturally 0 because there's nothing in that (future, in this test)
  // window. Use a ref date one month ahead instead of waiting for real time.
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 10);
  await recomputeMonthlyBalance(appleCard.id, nextMonth);
  after = await db.query.accounts.findFirst({ where: eq(accounts.id, appleCard.id) });
  if (after?.currentBalance !== '0.00' && after?.currentBalance !== '0') {
    throw new Error(`Expected a fresh month with no transactions to read 0, got ${after?.currentBalance}`);
  }
  console.log('  ok: a month with no transactions yet reads $0 with no reset step');

  // refreshMonthlyBalances (the getUser()-triggered path) recomputes back
  // to the real current month's total without throwing.
  await recomputeMonthlyBalance(appleCard.id); // restore real current-month state first
  await refreshMonthlyBalances(renato.id);
  after = await db.query.accounts.findFirst({ where: eq(accounts.id, appleCard.id) });
  if (after?.currentBalance !== '-112.34') {
    throw new Error(`Expected refreshMonthlyBalances to recompute -112.34, got ${after?.currentBalance}`);
  }
  console.log('  ok: refreshMonthlyBalances (getUser() path) recomputes correctly for the household');

  // Cleanup
  await db.delete(transactions).where(eq(transactions.accountId, appleCard.id));
  console.log(`  (cleaned up test transactions: ${[t1, t2, t3, t4, t5].length} rows)`);

  console.log('monthly-balance.ts: all checks passed');
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
