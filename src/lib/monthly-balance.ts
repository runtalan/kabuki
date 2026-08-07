import { db } from '@/db';
import { accounts, plaidItems, transactions } from '@/db/schema';
import { and, eq, gte, lt, inArray, isNull, sql } from 'drizzle-orm';
import { getHouseholdUserIds } from './household';

function monthBounds(date: Date = new Date()): { start: Date; end: Date; key: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return { start, end, key };
}

// Recomputes one pay-in-full account's currentBalance as the sum of this
// calendar month's transactions — not a stored running total that needs
// resetting, just always "what's the total for this month so far." It
// naturally reads $0 at the start of a new month because there's nothing
// in that month yet, with no reset step required.
export async function recomputeMonthlyBalance(accountId: string, refDate: Date = new Date()): Promise<void> {
  const { start, end, key } = monthBounds(refDate);

  const [{ total }] = await db
    .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        gte(transactions.date, start),
        lt(transactions.date, end),
        eq(transactions.hidden, false),
        isNull(transactions.transferType)
      )
    );

  await db
    .update(accounts)
    .set({ currentBalance: total, balanceMonth: key, updatedAt: new Date() })
    .where(eq(accounts.id, accountId));
}

// Recomputes every household account marked resetBalanceMonthly — called
// from getUser() on every authenticated request, so the displayed balance
// stays current "on login" without needing a separate cron/scheduler.
export async function refreshMonthlyBalances(userId: string): Promise<void> {
  const householdIds = await getHouseholdUserIds(userId);
  const householdItems = await db.query.plaidItems.findMany({
    where: inArray(plaidItems.userId, householdIds),
  });
  const itemIds = householdItems.map((item) => item.id);
  if (itemIds.length === 0) return;

  const candidates = await db.query.accounts.findMany({
    where: and(
      inArray(accounts.plaidItemId, itemIds),
      eq(accounts.resetBalanceMonthly, true)
    ),
  });

  for (const account of candidates) {
    await recomputeMonthlyBalance(account.id);
  }
}
