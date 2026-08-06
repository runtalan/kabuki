import { db } from '@/db';
import {
  accounts,
  transactions,
  categories,
  plaidItems,
} from '@/db/schema';
import { eq, and, desc, gte, lt, inArray, isNull } from 'drizzle-orm';
import {
  type OwnerFilter,
  filterAccountsByOwner,
  matchesOwnerFilter,
} from './owner-filter';

// Hidden transactions are excluded from spending totals, budgets, cash
// flow, and recent activity — but stay visible (dimmed) in the raw
// transaction list itself.
const NOT_HIDDEN = eq(transactions.hidden, false);
// Internal transfers / credit card payments — excluded from income, expense,
// and cash-flow totals the same way hidden transactions are, so paying your
// own credit card isn't double-counted as spend on top of the purchases that
// already hit the card. See transactions.transferType in db/schema.ts.
const NOT_TRANSFER = isNull(transactions.transferType);

// Get all accounts for a user
export async function getUserAccounts(userId: string, ownerFilter: OwnerFilter = 'all') {
  const userItems = await db.query.plaidItems.findMany({
    where: eq(plaidItems.userId, userId),
  });

  const itemIds = userItems.map((item) => item.id);
  if (itemIds.length === 0) return [];

  // Fetch accounts for all items
  const userAccounts = await db.query.accounts.findMany({
    where: inArray(accounts.plaidItemId, itemIds),
  });
  return filterAccountsByOwner(userAccounts, ownerFilter);
}

// Get spending by category for a given month (defaults to the current month)
export async function getSpendingByCategory(
  userId: string,
  refDate: Date = new Date(),
  ownerFilter: OwnerFilter = 'all'
) {
  const userItems = await db.query.plaidItems.findMany({
    where: eq(plaidItems.userId, userId),
  });

  const itemIds = userItems.map((item) => item.id);
  if (itemIds.length === 0) return [];

  const monthStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const monthEnd = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1);

  const userAccounts = await db.query.accounts.findMany({
    where: inArray(accounts.plaidItemId, itemIds),
  });

  const accountIds = userAccounts.map((acc) => acc.id);
  if (accountIds.length === 0) return [];
  const ownerByAccount = new Map(userAccounts.map((acc) => [acc.id, acc.owner]));

  const monthTransactions = (
    await db
      .select()
      .from(transactions)
      .where(
        and(
          gte(transactions.date, monthStart),
          lt(transactions.date, monthEnd),
          inArray(transactions.accountId, accountIds),
          NOT_HIDDEN,
          NOT_TRANSFER
        )
      )
  ).filter((tx) =>
    matchesOwnerFilter(tx.ownerOverride, ownerByAccount.get(tx.accountId), ownerFilter)
  );

  // Get categories and aggregate
  const allCategories = await db.query.categories.findMany();
  const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

  const spending: Record<
    string,
    { id: string; name: string; value: number; color: string; icon: string }
  > = {};

  for (const tx of monthTransactions) {
    if (Number(tx.amount) <= 0) {
      // Only count expenses. 'uncategorized' is a sentinel id (no real
      // category row) — the transactions API knows to treat it as "no
      // category assigned" rather than a literal id lookup.
      const categoryId = tx.categoryId || 'uncategorized';
      const category =
        categoryId === 'uncategorized'
          ? { id: 'uncategorized', name: 'Uncategorized', color: '#6b7280', icon: 'folder' }
          : categoryMap.get(categoryId);

      if (category) {
        const key = category.name;
        if (!spending[key]) {
          spending[key] = {
            id: category.id,
            name: category.name,
            value: 0,
            color: category.color,
            icon: category.icon,
          };
        }
        spending[key].value += Math.abs(Number(tx.amount));
      }
    }
  }

  return Object.values(spending);
}

// Get cash flow data (last 6 months)
export async function getCashFlowData(userId: string, ownerFilter: OwnerFilter = 'all') {
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
  const ownerByAccount = new Map(userAccounts.map((acc) => [acc.id, acc.owner]));

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const allTransactions = (
    await db
      .select()
      .from(transactions)
      .where(
        and(
          gte(transactions.date, sixMonthsAgo),
          inArray(transactions.accountId, accountIds),
          NOT_HIDDEN,
          NOT_TRANSFER
        )
      )
  ).filter((tx) =>
    matchesOwnerFilter(tx.ownerOverride, ownerByAccount.get(tx.accountId), ownerFilter)
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

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Monthly income/expense/savings series for the Cash Flow chart — longer
// trailing window than getCashFlowData (which only feeds the Home widget's
// "this month" snapshot).
export async function getCashFlowSeries(
  userId: string,
  months = 24,
  ownerFilter: OwnerFilter = 'all'
) {
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
  const ownerByAccount = new Map(userAccounts.map((acc) => [acc.id, acc.owner]));

  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const allTransactions = (
    await db
      .select()
      .from(transactions)
      .where(
        and(
          gte(transactions.date, rangeStart),
          inArray(transactions.accountId, accountIds),
          NOT_HIDDEN,
          NOT_TRANSFER
        )
      )
  ).filter((tx) =>
    matchesOwnerFilter(tx.ownerOverride, ownerByAccount.get(tx.accountId), ownerFilter)
  );

  const monthData: Record<string, { income: number; expenses: number; hasData: boolean }> = {};
  const order: { key: string; year: number; monthIndex: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    monthData[key] = { income: 0, expenses: 0, hasData: false };
    order.push({ key, year: date.getFullYear(), monthIndex: date.getMonth() });
  }

  for (const tx of allTransactions) {
    const key = `${tx.date.getFullYear()}-${tx.date.getMonth()}`;
    if (!monthData[key]) continue;
    monthData[key].hasData = true;
    if (Number(tx.amount) >= 0) {
      monthData[key].income += Number(tx.amount);
    } else {
      monthData[key].expenses += Math.abs(Number(tx.amount));
    }
  }

  return order.map(({ key, year, monthIndex }, idx) => {
    const { income, expenses, hasData } = monthData[key];
    const savings = income - expenses;
    return {
      month: MONTH_NAMES[monthIndex],
      year,
      label: `${MONTH_NAMES[monthIndex]} ${year}`,
      // "?month=" URL param format shared with the Spending page's month
      // toggle, so clicking a bar/point can link straight to that month.
      monthKey: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      income: Math.round(income),
      expenses: Math.round(expenses),
      savings: Math.round(savings),
      savingsRate: income > 0 ? (savings / income) * 100 : 0,
      isCurrentMonth: idx === order.length - 1,
      hasData,
    };
  });
}

// Get every income/expense transaction in a given calendar month (defaults
// to the current one), with enough relations loaded to drive the edit
// modal — powers the Home → Cash Flow page's income/expense tables, which
// can browse to any past month via the chart or the prev/next arrows.
export async function getMonthTransactions(
  userId: string,
  refDate: Date = new Date(),
  ownerFilter: OwnerFilter = 'all'
) {
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

  const monthStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const monthEnd = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1);

  const rows = await db.query.transactions.findMany({
    where: and(
      gte(transactions.date, monthStart),
      lt(transactions.date, monthEnd),
      inArray(transactions.accountId, accountIds),
      NOT_HIDDEN,
      NOT_TRANSFER
    ),
    with: {
      category: true,
      account: {
        columns: { id: true, name: true, displayName: true, owner: true, mask: true, isManual: true },
      },
      tags: { with: { tag: true } },
    },
    orderBy: desc(transactions.date),
  });

  return rows.filter((tx) => matchesOwnerFilter(tx.ownerOverride, tx.account?.owner, ownerFilter));
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
export async function getRecentTransactions(
  userId: string,
  limit = 10,
  ownerFilter: OwnerFilter = 'all'
) {
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
  const accountOwnerMap = new Map(userAccounts.map((acc) => [acc.id, acc.owner]));

  // Owner filtering happens after the SQL LIMIT, so over-fetch when a filter
  // is active — otherwise "Renato only" could come back with fewer than
  // `limit` rows even when plenty of his transactions exist further back.
  const fetchLimit = ownerFilter === 'all' ? limit : limit * 6;

  const allTransactions = (
    await db
      .select()
      .from(transactions)
      .where(and(inArray(transactions.accountId, accountIds), NOT_HIDDEN))
      .orderBy(desc(transactions.date))
      .limit(fetchLimit)
  )
    .filter((tx) =>
      matchesOwnerFilter(tx.ownerOverride, accountOwnerMap.get(tx.accountId), ownerFilter)
    )
    .slice(0, limit);

  const allCategories = await db.query.categories.findMany();
  const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

  return allTransactions.map((tx) => {
    const category = tx.categoryId ? categoryMap.get(tx.categoryId) : null;
    return {
      id: tx.id,
      name: tx.name,
      category: category?.name || 'Uncategorized',
      categoryIcon: category?.icon || null,
      categoryColor: category?.color || null,
      merchantLogoUrl: tx.merchantLogoUrl || null,
      owner: accountOwnerMap.get(tx.accountId) || 'joint',
      amount: Number(tx.amount),
      date: tx.date,
      merchant: tx.merchant || tx.name,
    };
  });
}
