import { db } from '@/db';
import { accounts, plaidItems, accountBalanceHistory } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { generateId } from './id';
import { getHouseholdUserIds } from './household';

function currentMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Lazily zeroes out any household account marked resetBalanceMonthly whose
// balanceMonth has fallen behind the current month — called from getUser()
// on every authenticated request, so this runs "on login" without needing
// a separate cron/scheduler. A null balanceMonth (freshly created/migrated
// account) is left alone rather than treated as stale, since there's
// nothing meaningful to reset yet.
export async function resetStaleMonthlyBalances(userId: string): Promise<void> {
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

  const thisMonth = currentMonthKey();

  for (const account of candidates) {
    if (!account.balanceMonth || account.balanceMonth === thisMonth) continue;

    await db
      .update(accounts)
      .set({ currentBalance: '0', balanceMonth: thisMonth, updatedAt: new Date() })
      .where(eq(accounts.id, account.id));

    await db.insert(accountBalanceHistory).values({
      id: generateId(),
      accountId: account.id,
      balance: '0',
      recordedAt: new Date(),
    });
  }
}
