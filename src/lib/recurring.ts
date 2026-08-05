import { db } from '@/db';
import { recurringSeries } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getRecurringItems, normalizeMerchant } from './spending-insights';
import { isoDay, PER_MONTH, type Frequency, type RecurringEntry } from './recurring-shared';

// Merges heuristic detection with the user's own decisions and manual entries.
// Dismissed series drop out entirely; manual entries are appended; everything
// else keeps detection's numbers unless the user overrode them.
export async function getRecurringEntries(userId: string): Promise<RecurringEntry[]> {
  const [detected, overrides, allCategories] = await Promise.all([
    getRecurringItems(userId),
    db.query.recurringSeries.findMany({ where: eq(recurringSeries.userId, userId) }),
    db.query.categories.findMany(),
  ]);

  const categoryMap = new Map(allCategories.map((c) => [c.id, c]));
  const overrideByKey = new Map(overrides.map((o) => [o.merchantKey, o]));
  const entries: RecurringEntry[] = [];

  for (const item of detected) {
    const override = overrideByKey.get(item.merchantKey);
    if (override?.status === 'dismissed') continue;

    const frequency = (override?.frequency as Frequency) || item.frequency;
    const amount = override?.amount != null ? Math.abs(Number(override.amount)) : item.amount;
    const category = override?.categoryId
      ? categoryMap.get(override.categoryId)
      : item.categoryId
        ? categoryMap.get(item.categoryId)
        : null;

    entries.push({
      id: override?.id ?? null,
      merchantKey: item.merchantKey,
      merchant: override?.merchantName || item.merchant,
      categoryId: category?.id ?? null,
      categoryName: category?.name ?? null,
      categoryIcon: category?.icon ?? null,
      categoryColor: category?.color ?? null,
      frequency,
      amount,
      monthlyCost: amount * PER_MONTH[frequency],
      nextDate: override?.nextDate ? isoDay(override.nextDate) : item.nextDate,
      isIncome: item.isIncome,
      isManual: false,
      needsReview: !override,
      previousAmount: item.previousAmount,
      priceIncreased: item.priceIncreased,
      occurrences: item.occurrences,
    });
  }

  // Manual entries have no detected counterpart to merge with.
  for (const row of overrides) {
    if (!row.isManual || row.status === 'dismissed') continue;
    const frequency = (row.frequency as Frequency) || 'monthly';
    const amount = Math.abs(Number(row.amount ?? 0));
    const category = row.categoryId ? categoryMap.get(row.categoryId) : null;

    entries.push({
      id: row.id,
      merchantKey: row.merchantKey,
      merchant: row.merchantName,
      categoryId: category?.id ?? null,
      categoryName: category?.name ?? null,
      categoryIcon: category?.icon ?? null,
      categoryColor: category?.color ?? null,
      frequency,
      amount,
      monthlyCost: amount * PER_MONTH[frequency],
      nextDate: row.nextDate ? isoDay(row.nextDate) : isoDay(new Date()),
      isIncome: row.isIncome,
      isManual: true,
      needsReview: false,
      previousAmount: null,
      priceIncreased: false,
      occurrences: 0,
    });
  }

  return entries.sort((a, b) => b.monthlyCost - a.monthlyCost);
}

export { normalizeMerchant };
