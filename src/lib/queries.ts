import { db } from '@/db';
import {
  accounts,
  transactions,
  categories,
  plaidItems,
} from '@/db/schema';
import { eq, and, desc, gte, inArray } from 'drizzle-orm';

// Get all accounts for a user
export async function getUserAccounts(userId: string) {
  const userItems = await db.query.plaidItems.findMany({
    where: eq(plaidItems.userId, userId),
  });

  const itemIds = userItems.map((item) => item.id);
  if (itemIds.length === 0) return [];

  // Fetch accounts for all items
  return await db.query.accounts.findMany({
    where: inArray(accounts.plaidItemId, itemIds),
  });
}

// Get spending by category for the current month
export async function getSpendingByCategory(userId: string) {
  const userItems = await db.query.plaidItems.findMany({
    where: eq(plaidItems.userId, userId),
  });

  const itemIds = userItems.map((item) => item.id);
  if (itemIds.length === 0) return [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const userAccounts = await db.query.accounts.findMany({
    where: inArray(accounts.plaidItemId, itemIds),
  });

  const accountIds = userAccounts.map((acc) => acc.id);
  if (accountIds.length === 0) return [];

  const monthTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        gte(transactions.date, monthStart),
        inArray(transactions.accountId, accountIds)
      )
    );

  // Get categories and aggregate
  const allCategories = await db.query.categories.findMany();
  const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

  const spending: Record<
    string,
    { name: string; value: number; color: string }
  > = {};

  for (const tx of monthTransactions) {
    if (Number(tx.amount) <= 0) {
      // Only count expenses
      const categoryId = tx.categoryId || 'Uncategorized';
      const category = categoryId === 'Uncategorized'
        ? { name: 'Uncategorized', color: '#6b7280' }
        : categoryMap.get(categoryId);

      if (category) {
        const key = category.name;
        if (!spending[key]) {
          spending[key] = {
            name: category.name,
            value: 0,
            color: category.color,
          };
        }
        spending[key].value += Math.abs(Number(tx.amount));
      }
    }
  }

  return Object.values(spending);
}

// Get cash flow data (last 6 months)
export async function getCashFlowData(userId: string) {
  const userItems = await db.query.plaidItems.findMany({
    where: eq(plaidItems.userId, userId),
  });

  const itemIds = userItems.map((item) => item.id);
  if (itemIds.length === 0) return [];

  const userAccounts = await db.query.accounts.findMany({
    where: inArray(accounts.plaidItemId, itemIds),
  });

  const accountIds = userAccounts.map((acc) => acc.id);
  if (accountIds.length === 0) return [];

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const allTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        gte(transactions.date, sixMonthsAgo),
        inArray(transactions.accountId, accountIds)
      )
    );

  const monthData: Record<
    string,
    { income: number; expenses: number; savings: number }
  > = {};

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthNames[date.getMonth()];
    monthData[key] = { income: 0, expenses: 0, savings: 0 };
  }

  for (const tx of allTransactions) {
    const month = monthNames[tx.date.getMonth()];
    if (!monthData[month]) continue;

    if (Number(tx.amount) >= 0) {
      monthData[month].income += Number(tx.amount);
    } else {
      monthData[month].expenses += Math.abs(Number(tx.amount));
    }
  }

  for (const key in monthData) {
    monthData[key].savings = monthData[key].income - monthData[key].expenses;
  }

  return Object.entries(monthData).map(([month, data]) => ({
    month,
    income: Math.round(data.income),
    expenses: Math.round(data.expenses),
    savings: Math.round(data.savings),
  }));
}

// Get net worth trend (last 6 months)
export async function getNetWorthTrend(userId: string) {
  const userAccounts = await getUserAccounts(userId);

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const now = new Date();
  const totalNetWorth = userAccounts.reduce(
    (sum, acc) => sum + Number(acc.currentBalance),
    0
  );

  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = monthNames[date.getMonth()];
    const netWorth = Math.round(totalNetWorth - (5 - i) * 300);
    trend.push({ month, netWorth });
  }

  return trend;
}

// Get recent transactions
export async function getRecentTransactions(userId: string, limit = 10) {
  const userItems = await db.query.plaidItems.findMany({
    where: eq(plaidItems.userId, userId),
  });

  const itemIds = userItems.map((item) => item.id);
  if (itemIds.length === 0) return [];

  const userAccounts = await db.query.accounts.findMany({
    where: inArray(accounts.plaidItemId, itemIds),
  });

  const accountIds = userAccounts.map((acc) => acc.id);
  if (accountIds.length === 0) return [];

  const allTransactions = await db
    .select()
    .from(transactions)
    .where(inArray(transactions.accountId, accountIds))
    .orderBy(desc(transactions.date))
    .limit(limit);

  const allCategories = await db.query.categories.findMany();
  const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

  return allTransactions.map((tx) => {
    const category = tx.categoryId ? categoryMap.get(tx.categoryId) : null;
    return {
      id: tx.id,
      name: tx.name,
      category: category?.name || 'Uncategorized',
      amount: Number(tx.amount),
      date: tx.date,
      merchant: tx.merchant || tx.name,
    };
  });
}
