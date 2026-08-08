import { db } from '@/db';
import { recurringSeries } from '@/db/schema';
import { inArray } from 'drizzle-orm';
import { getRecurringItems, normalizeMerchant } from './spending-insights';
import { isoDay, perMonthFactor, type Frequency, type RecurringEntry } from './recurring-shared';
import type { OwnerFilter } from './owner-filter';
import { getHouseholdUserIds } from './household';

// Merges heuristic detection with the user's own decisions and manual entries.
// Dismissed series drop out entirely; manual entries are appended; everything
// else keeps detection's numbers unless the user overrode them.
export async function getRecurringEntries(
  userId: string,
  ownerFilter: OwnerFilter = 'all'
): Promise<RecurringEntry[]> {
  const householdIds = await getHouseholdUserIds(userId);
  const [detected, overrides, allCategories] = await Promise.all([
    getRecurringItems(userId, ownerFilter),
    db.query.recurringSeries.findMany({ where: inArray(recurringSeries.userId, householdIds) }),
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
      logoUrl: item.logoUrl,
      frequency,
      intervalDays: null,
      amount,
      monthlyCost: amount * perMonthFactor(frequency),
      nextDate: override?.nextDate ? isoDay(override.nextDate) : item.nextDate,
      isIncome: item.isIncome,
      isManual: false,
      manualSource: null,
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
      logoUrl: null,
      frequency,
      intervalDays: null,
      amount,
      monthlyCost: amount * perMonthFactor(frequency),
      nextDate: row.nextDate ? isoDay(row.nextDate) : isoDay(new Date()),
      isIncome: row.isIncome,
      isManual: true,
      manualSource: 'series' as const,
      needsReview: false,
      previousAmount: null,
      priceIncreased: false,
      occurrences: 0,
    });
  }

  return entries.sort((a, b) => b.monthlyCost - a.monthlyCost);
}

export { normalizeMerchant };
