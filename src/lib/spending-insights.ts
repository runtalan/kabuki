import { db } from '@/db';
import { accounts, transactions, categories, plaidItems } from '@/db/schema';
import { and, eq, gte, lt, inArray, isNull } from 'drizzle-orm';
import { type OwnerFilter, matchesOwnerFilter } from './owner-filter';
import { getHouseholdUserIds } from './household';

const NOT_HIDDEN = eq(transactions.hidden, false);
// See queries.ts's NOT_TRANSFER for the rationale — internal transfers /
// credit card payments are excluded from every spend/budget total here too.
const NOT_TRANSFER = isNull(transactions.transferType);

// All of a user's account ids (unfiltered — owner filtering happens after
// fetching transactions, since it must respect each transaction's own
// `ownerOverride`, not just the owning account's `owner`) plus an
// accountId -> owner lookup for that filtering step.
export async function getUserAccountContext(userId: string) {
  const userItems = await db.query.plaidItems.findMany({
    where: inArray(plaidItems.userId, await getHouseholdUserIds(userId)),
  });
  const itemIds = userItems.map((item) => item.id);
  if (itemIds.length === 0) {
    return { accountIds: [] as string[], ownerByAccount: new Map<string, string | null>() };
  }
  const userAccounts = await db.query.accounts.findMany({
    where: inArray(accounts.plaidItemId, itemIds),
  });
  return {
    accountIds: userAccounts.map((acc) => acc.id),
    ownerByAccount: new Map(userAccounts.map((acc) => [acc.id, acc.owner])),
  };
}

// Spending overview: a given month's total, prior-months average, and a
// daily cumulative spend curve for that month vs. the one before it.
// Defaults to the real current month; pass refDate to view any other month
// (e.g. so sandbox/demo data from a past month isn't stuck looking empty
// just because it's not the calendar's current month).
export async function getSpendingOverview(
  userId: string,
  refDate: Date = new Date(),
  ownerFilter: OwnerFilter = 'all'
) {
  const { accountIds, ownerByAccount } = await getUserAccountContext(userId);
  const emptyDaysInMonth = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0).getDate();
  const empty = {
    spentThisMonth: 0,
    monthlyAverage: 0,
    daysElapsed: emptyDaysInMonth,
    daysInMonth: emptyDaysInMonth,
    velocity: [] as { day: number; current: number | null; previous: number }[],
  };
  if (accountIds.length === 0) return empty;

  const now = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  // Exclusive upper bound so viewing a past month never pulls in later data.
  const windowEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const rows = (
    await db
      .select()
      .from(transactions)
      .where(
        and(
          gte(transactions.date, sixMonthsAgo),
          lt(transactions.date, windowEnd),
          inArray(transactions.accountId, accountIds),
          NOT_HIDDEN,
          NOT_TRANSFER
        )
      )
  ).filter((tx) =>
    matchesOwnerFilter(tx.ownerOverride, ownerByAccount.get(tx.accountId), ownerFilter)
  );

  const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const thisMonthKey = monthKey(now);
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = monthKey(prevMonthDate);

  const totalsByMonth: Record<string, number> = {};
  const dailyThisMonth: Record<number, number> = {};
  const dailyPrevMonth: Record<number, number> = {};

  for (const tx of rows) {
    const amount = Number(tx.amount);
    if (amount > 0) continue; // expenses only
    const spend = Math.abs(amount);
    const key = monthKey(tx.date);
    totalsByMonth[key] = (totalsByMonth[key] || 0) + spend;
    if (key === thisMonthKey) {
      dailyThisMonth[tx.date.getDate()] = (dailyThisMonth[tx.date.getDate()] || 0) + spend;
    } else if (key === prevMonthKey) {
      dailyPrevMonth[tx.date.getDate()] = (dailyPrevMonth[tx.date.getDate()] || 0) + spend;
    }
  }

  const spentThisMonth = totalsByMonth[thisMonthKey] || 0;

  // Average over prior full months that actually have data
  const priorTotals = Object.entries(totalsByMonth)
    .filter(([key]) => key !== thisMonthKey)
    .map(([, total]) => total);
  const monthlyAverage =
    priorTotals.length > 0
      ? priorTotals.reduce((a, b) => a + b, 0) / priorTotals.length
      : 0;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysInPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();

  // Only the real current month has a "so far" cutoff — a past month is
  // complete, so its cumulative line should run all the way to month end.
  const realToday = new Date();
  const isRealCurrentMonth =
    now.getFullYear() === realToday.getFullYear() && now.getMonth() === realToday.getMonth();
  const today = isRealCurrentMonth ? realToday.getDate() : daysInMonth;

  let cumCurrent = 0;
  let cumPrev = 0;
  const velocity: { day: number; current: number | null; previous: number }[] = [];
  for (let day = 1; day <= Math.max(daysInMonth, daysInPrevMonth); day++) {
    cumCurrent += dailyThisMonth[day] || 0;
    cumPrev += dailyPrevMonth[day] || 0;
    velocity.push({
      day,
      current: day <= today && day <= daysInMonth ? Math.round(cumCurrent) : null,
      previous: Math.round(cumPrev),
    });
  }

  return {
    spentThisMonth,
    monthlyAverage,
    daysElapsed: today,
    daysInMonth,
    velocity,
  };
}

export interface MonthlyBudgetHistoryPoint {
  year: number;
  month: number; // 0-indexed, matches Date.getMonth()
  label: string; // "Jan"
  spent: number;
  budget: number;
  variance: number; // budget - spent; positive = under budget
  hasData: boolean; // false when the account had zero transactions that month
}

// Real month-by-month spend across all budgeted categories, for the trailing
// `monthsBack` months (default 12, most recent last). Compares each month's
// actual spend against the categories' *current* budget totals — there's no
// historical snapshot of what the budget was at the time, so this answers
// "how would this month have looked against today's budget" rather than
// "was I over the budget that existed back then." Months with zero
// transactions in the account are flagged via hasData so the UI can grey
// them out instead of implying a suspiciously perfect $0 month.
export async function getMonthlyBudgetHistory(
  userId: string,
  monthsBack = 12,
  ownerFilter: OwnerFilter = 'all'
): Promise<MonthlyBudgetHistoryPoint[]> {
  const { accountIds, ownerByAccount } = await getUserAccountContext(userId);

  const allCategories = await db.query.categories.findMany();
  const budgetedCategoryIds = new Set(
    allCategories.filter((c) => c.monthlyBudget && Number(c.monthlyBudget) > 0).map((c) => c.id)
  );
  const totalBudget = allCategories.reduce(
    (sum, c) => sum + (c.monthlyBudget ? Number(c.monthlyBudget) : 0),
    0
  );

  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);

  const points: MonthlyBudgetHistoryPoint[] = Array.from({ length: monthsBack }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1) + i, 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      spent: 0,
      budget: totalBudget,
      variance: totalBudget,
      hasData: false,
    };
  });

  if (accountIds.length === 0 || budgetedCategoryIds.size === 0) return points;

  const rows = (
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

  const byMonthKey = new Map<string, { spent: number; hasData: boolean }>();
  for (const point of points) {
    byMonthKey.set(`${point.year}-${point.month}`, { spent: 0, hasData: false });
  }

  for (const tx of rows) {
    const key = `${tx.date.getFullYear()}-${tx.date.getMonth()}`;
    const bucket = byMonthKey.get(key);
    if (!bucket) continue;
    bucket.hasData = true;
    // Only expenses in currently-budgeted categories count toward "spent".
    if (Number(tx.amount) < 0 && tx.categoryId && budgetedCategoryIds.has(tx.categoryId)) {
      bucket.spent += Math.abs(Number(tx.amount));
    }
  }

  return points.map((point) => {
    const bucket = byMonthKey.get(`${point.year}-${point.month}`)!;
    return {
      ...point,
      spent: bucket.spent,
      hasData: bucket.hasData,
      variance: totalBudget - bucket.spent,
    };
  });
}

// Auto-suggested budget per category: the trailing 3-month average spend,
// rounded to a clean number. Excludes the current (partial) month so a
// suggestion isn't skewed by however far through the month it is. Only
// suggests for categories with spend in at least 2 of the last 3 months —
// a single one-off month (e.g. a big one-time purchase) shouldn't anchor a
// recurring budget.
export async function getCategoryBudgetSuggestions(
  userId: string,
  ownerFilter: OwnerFilter = 'all'
): Promise<Record<string, number>> {
  const { accountIds, ownerByAccount } = await getUserAccountContext(userId);
  if (accountIds.length === 0) return {};

  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const rows = (
    await db
      .select()
      .from(transactions)
      .where(
        and(
          gte(transactions.date, threeMonthsAgo),
          inArray(transactions.accountId, accountIds),
          NOT_HIDDEN,
          NOT_TRANSFER
        )
      )
  ).filter((tx) =>
    matchesOwnerFilter(tx.ownerOverride, ownerByAccount.get(tx.accountId), ownerFilter)
  );

  const allCategories = await db.query.categories.findMany();
  const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

  const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  // categoryName -> monthKey -> total spend that month
  const byCategory = new Map<string, Map<string, number>>();

  for (const tx of rows) {
    const amount = Number(tx.amount);
    if (amount > 0) continue; // expenses only
    if (tx.date >= currentMonthStart) continue; // exclude the partial current month
    if (!tx.categoryId) continue; // no signal to suggest against yet
    const category = categoryMap.get(tx.categoryId);
    if (!category) continue;

    const months = byCategory.get(category.name) || new Map<string, number>();
    const key = monthKey(tx.date);
    months.set(key, (months.get(key) || 0) + Math.abs(amount));
    byCategory.set(category.name, months);
  }

  const suggestions: Record<string, number> = {};
  for (const [name, months] of byCategory) {
    if (months.size < 2) continue; // need at least 2 of the last 3 months
    const total = Array.from(months.values()).reduce((a, b) => a + b, 0);
    const average = total / months.size;
    // Round to a clean $5 increment so suggestions don't look falsely precise
    suggestions[name] = Math.max(5, Math.round(average / 5) * 5);
  }

  return suggestions;
}

export interface TopMerchant {
  name: string;
  amount: number;
  categoryIcon: string | null;
  categoryColor: string | null;
  logoUrl: string | null;
}

// Top merchants by spend for a given month (defaults to the current month) —
// same month-scoping as getSpendingOverview/getSpendingByCategory so it
// respects the Spending Overview page's month toggle.
export async function getTopMerchants(
  userId: string,
  refDate: Date = new Date(),
  limit = 5,
  ownerFilter: OwnerFilter = 'all'
): Promise<TopMerchant[]> {
  const { accountIds, ownerByAccount } = await getUserAccountContext(userId);
  if (accountIds.length === 0) return [];

  const monthStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const monthEnd = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1);

  const rows = (
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

  const allCategories = await db.query.categories.findMany();
  const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

  const totals = new Map<
    string,
    { amount: number; categoryIcon: string | null; categoryColor: string | null; logoUrl: string | null }
  >();
  for (const tx of rows) {
    const amount = Number(tx.amount);
    if (amount > 0) continue; // expenses only
    const key = tx.merchant || tx.name;
    const category = tx.categoryId ? categoryMap.get(tx.categoryId) : null;
    const existing = totals.get(key);
    totals.set(key, {
      amount: (existing?.amount || 0) + Math.abs(amount),
      categoryIcon: existing?.categoryIcon ?? category?.icon ?? null,
      categoryColor: existing?.categoryColor ?? category?.color ?? null,
      logoUrl: existing?.logoUrl ?? tx.merchantLogoUrl ?? null,
    });
  }

  return Array.from(totals.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export interface RecurringItem {
  merchantKey: string; // normalized merchant — stable join key for user overrides
  merchant: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  logoUrl: string | null;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  amount: number; // latest charge
  previousAmount: number | null; // charge before that (for price-change flag)
  priceIncreased: boolean;
  monthlyCost: number; // normalized to a monthly figure
  lastDate: string; // ISO
  nextDate: string; // ISO, projected
  occurrences: number;
  isIncome: boolean;
}

const FREQUENCY_BUCKETS: {
  label: RecurringItem['frequency'];
  min: number;
  max: number;
  perMonth: number;
}[] = [
  { label: 'weekly', min: 5, max: 9, perMonth: 4.33 },
  { label: 'biweekly', min: 11, max: 17, perMonth: 2.17 },
  { label: 'monthly', min: 24, max: 38, perMonth: 1 },
  { label: 'yearly', min: 330, max: 400, perMonth: 1 / 12 },
];

export function normalizeMerchant(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[#*]\S+/g, '') // strip reference codes like "#4821"
    .replace(/\d{3,}/g, '') // strip long digit runs (store/confirmation numbers)
    .replace(/\s+/g, ' ')
    .trim();
}

// Detects recurring charges from real history: same merchant, evenly spaced
// intervals matching a known cadence, broadly similar amounts. Heuristic, not
// Plaid's recurring API — good enough to surface subscriptions and bills.
export async function getRecurringItems(
  userId: string,
  ownerFilter: OwnerFilter = 'all'
): Promise<RecurringItem[]> {
  const { accountIds, ownerByAccount } = await getUserAccountContext(userId);
  if (accountIds.length === 0) return [];

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const rows = (
    await db
      .select()
      .from(transactions)
      .where(
        and(
          gte(transactions.date, oneYearAgo),
          inArray(transactions.accountId, accountIds),
          NOT_HIDDEN,
          NOT_TRANSFER
        )
      )
  ).filter((tx) =>
    matchesOwnerFilter(tx.ownerOverride, ownerByAccount.get(tx.accountId), ownerFilter)
  );

  const allCategories = await db.query.categories.findMany();
  const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

  const groups = new Map<string, typeof rows>();
  for (const tx of rows) {
    if (tx.pending) continue;
    const key = normalizeMerchant(tx.merchant || tx.name);
    if (!key || key.length < 3) continue;
    const arr = groups.get(key) || [];
    arr.push(tx);
    groups.set(key, arr);
  }

  const items: RecurringItem[] = [];

  for (const [merchantKey, txs] of groups) {
    if (txs.length < 2) continue;
    txs.sort((a, b) => a.date.getTime() - b.date.getTime());

    const gaps: number[] = [];
    for (let i = 1; i < txs.length; i++) {
      gaps.push((txs[i].date.getTime() - txs[i - 1].date.getTime()) / 86_400_000);
    }
    gaps.sort((a, b) => a - b);
    const medianGap = gaps[Math.floor(gaps.length / 2)];

    const bucket = FREQUENCY_BUCKETS.find((b) => medianGap >= b.min && medianGap <= b.max);
    if (!bucket) continue;
    // Yearly needs at least 2 points a year apart; shorter cadences need 3+
    if (bucket.label !== 'yearly' && txs.length < 3) continue;

    // Most gaps should fit the cadence, not just the median
    const fitting = gaps.filter((g) => g >= bucket.min && g <= bucket.max).length;
    if (fitting / gaps.length < 0.6) continue;

    // Amounts should be broadly consistent (subscriptions, bills, paychecks)
    const amounts = txs.map((t) => Math.abs(Number(t.amount)));
    const medianAmount = [...amounts].sort((a, b) => a - b)[Math.floor(amounts.length / 2)];
    if (medianAmount < 1) continue;
    const consistent = amounts.filter(
      (a) => Math.abs(a - medianAmount) / medianAmount <= 0.35
    ).length;
    if (consistent / amounts.length < 0.6) continue;

    const latest = txs[txs.length - 1];
    const previous = txs[txs.length - 2];
    const latestAmount = Math.abs(Number(latest.amount));
    const previousAmount = previous ? Math.abs(Number(previous.amount)) : null;
    const isIncome = Number(latest.amount) > 0;

    // Only flag as recurring if it hasn't lapsed (missed ~2 cycles)
    const daysSinceLast = (Date.now() - latest.date.getTime()) / 86_400_000;
    if (daysSinceLast > bucket.max * 2) continue;

    const nextDate = new Date(latest.date);
    nextDate.setDate(nextDate.getDate() + Math.round(medianGap));

    const category = latest.categoryId ? categoryMap.get(latest.categoryId) : null;

    items.push({
      merchantKey,
      merchant: latest.merchant || latest.name,
      categoryId: category?.id || null,
      categoryName: category?.name || null,
      categoryIcon: category?.icon || null,
      categoryColor: category?.color || null,
      logoUrl: latest.merchantLogoUrl || null,
      frequency: bucket.label,
      amount: latestAmount,
      previousAmount,
      priceIncreased:
        !isIncome &&
        previousAmount !== null &&
        latestAmount > previousAmount * 1.02,
      monthlyCost: latestAmount * bucket.perMonth,
      lastDate: latest.date.toISOString().slice(0, 10),
      nextDate: nextDate.toISOString().slice(0, 10),
      occurrences: txs.length,
      isIncome,
    });
  }

  return items.sort((a, b) => b.monthlyCost - a.monthlyCost);
}

// All of a household's transactions at a given normalized merchant, no time
// window — unlike getRecurringItems (which only looks at the last year for
// live detection), this must find a transaction being edited even if it's
// old, since the modal's "mark as recurring" action needs every occurrence.
export async function getTransactionsForMerchant(
  userId: string,
  merchantKey: string,
  ownerFilter: OwnerFilter = 'all'
) {
  const { accountIds, ownerByAccount } = await getUserAccountContext(userId);
  if (accountIds.length === 0) return [];

  const rows = (
    await db
      .select()
      .from(transactions)
      .where(and(inArray(transactions.accountId, accountIds), NOT_HIDDEN, NOT_TRANSFER))
  ).filter(
    (tx) =>
      matchesOwnerFilter(tx.ownerOverride, ownerByAccount.get(tx.accountId), ownerFilter) &&
      normalizeMerchant(tx.merchant || tx.name) === merchantKey
  );

  return rows;
}

export interface RecurrenceEstimate {
  frequency: RecurringItem['frequency'];
  amount: number; // absolute value, latest occurrence
  nextDate: Date;
  categoryId: string | null;
  isIncome: boolean;
}

// Best-effort recurrence estimate for a user-confirmed merchant. Unlike
// getRecurringItems (which requires a clean, consistent pattern before ever
// suggesting recurrence unprompted), this never refuses — the user has
// already said "this is recurring," so we give our best guess instead of
// nothing. A single transaction is assumed monthly, anchored on its date, per
// product decision; two or more transactions reuse getRecurringItems's
// median-gap-to-bucket lookup, falling back to the closest bucket by
// midpoint when the gap doesn't cleanly land in any range.
export function estimateRecurrence(
  txs: { date: Date; amount: string; categoryId: string | null }[]
): RecurrenceEstimate {
  const sorted = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());
  const latest = sorted[sorted.length - 1];
  const latestAmount = Math.abs(Number(latest.amount));
  const isIncome = Number(latest.amount) > 0;

  if (sorted.length < 2) {
    const nextDate = new Date(latest.date);
    nextDate.setMonth(nextDate.getMonth() + 1);
    return { frequency: 'monthly', amount: latestAmount, nextDate, categoryId: latest.categoryId, isIncome };
  }

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push((sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / 86_400_000);
  }
  gaps.sort((a, b) => a - b);
  const medianGap = gaps[Math.floor(gaps.length / 2)];

  const inRange = FREQUENCY_BUCKETS.find((b) => medianGap >= b.min && medianGap <= b.max);
  const bucket =
    inRange ||
    FREQUENCY_BUCKETS.reduce((closest, b) => {
      const mid = (b.min + b.max) / 2;
      const closestMid = (closest.min + closest.max) / 2;
      return Math.abs(medianGap - mid) < Math.abs(medianGap - closestMid) ? b : closest;
    });

  const nextDate = new Date(latest.date);
  nextDate.setDate(nextDate.getDate() + Math.round(medianGap));

  return {
    frequency: bucket.label,
    amount: latestAmount,
    nextDate,
    categoryId: latest.categoryId,
    isIncome,
  };
}
