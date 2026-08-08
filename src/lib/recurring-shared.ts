// Client-safe half of the recurring feature: types, labels, and the date math
// for projecting a series onto a calendar month. Kept free of DB imports so
// client components can use it without pulling the postgres driver into the
// browser bundle — the server-only half lives in ./recurring.
export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  yearly: 'Annual',
  custom: 'Custom',
};

// How many times a cadence lands in a month — used to pro-rate to a monthly figure.
export const PER_MONTH: Record<Exclude<Frequency, 'custom'>, number> = {
  weekly: 4.33,
  biweekly: 2.17,
  monthly: 1,
  yearly: 1 / 12,
};

// Monthly-cost factor for any cadence, including a custom "every N days"
// interval that PER_MONTH can't hold as a fixed constant.
export function perMonthFactor(frequency: Frequency, intervalDays?: number | null): number {
  if (frequency === 'custom') return 30.44 / (intervalDays || 30);
  return PER_MONTH[frequency];
}

export interface RecurringEntry {
  id: string | null; // recurring_series row id or transaction id, null when detected-but-unreviewed
  merchantKey: string;
  merchant: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  logoUrl: string | null;
  frequency: Frequency;
  intervalDays: number | null; // set only when frequency === 'custom'
  amount: number;
  monthlyCost: number;
  nextDate: string; // ISO yyyy-mm-dd
  isIncome: boolean;
  isManual: boolean;
  // Which backing table a manual entry's Edit/Remove actions target — null
  // for pure detections (no manual row at all yet).
  manualSource: 'series' | 'transaction' | null;
  // Detected but not yet confirmed or dismissed — drives the review queue.
  needsReview: boolean;
  previousAmount: number | null;
  priceIncreased: boolean;
  occurrences: number;
}

export interface RecurringOccurrence {
  entry: RecurringEntry;
  date: string; // ISO yyyy-mm-dd
}

export function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function parseDay(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// (parseDay above is the same local-midnight parse as parseLocalDate in
// src/lib/date.ts — duplicated here rather than imported so this module has
// zero cross-file deps beyond its own scope. Keep both in sync if either changes.)

// Date-only strings ("2026-08-20") parse as UTC midnight via `new Date()`,
// which reads back a day early anywhere west of UTC once formatted with local
// getters. Anchor them to local midnight instead; pass through full timestamps.
export function parseDateInput(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseDay(value) : new Date(value);
}

// Projects each series forward/backward from its known next date so any month —
// past or future — shows the charges that land in it.
export function occurrencesInMonth(
  entries: RecurringEntry[],
  year: number,
  month: number // 0-indexed
): RecurringOccurrence[] {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const out: RecurringOccurrence[] = [];

  for (const entry of entries) {
    const anchor = parseDay(entry.nextDate);

    if (entry.frequency === 'monthly') {
      // Keep the same day-of-month, clamped for short months.
      const day = Math.min(anchor.getDate(), monthEnd.getDate());
      out.push({ entry, date: isoDay(new Date(year, month, day)) });
      continue;
    }

    if (entry.frequency === 'yearly') {
      if (anchor.getMonth() === month) {
        const day = Math.min(anchor.getDate(), monthEnd.getDate());
        out.push({ entry, date: isoDay(new Date(year, month, day)) });
      }
      continue;
    }

    // Weekly / biweekly / custom: step by a fixed interval from the anchor in
    // both directions until we cover the visible month.
    const stepDays =
      entry.frequency === 'weekly' ? 7 : entry.frequency === 'biweekly' ? 14 : entry.intervalDays || 30;
    const cursor = new Date(anchor);
    // Rewind to at or before the start of the month.
    while (cursor > monthStart) cursor.setDate(cursor.getDate() - stepDays);
    // Then walk forward, collecting anything inside the month.
    while (cursor <= monthEnd) {
      if (cursor >= monthStart) out.push({ entry, date: isoDay(new Date(cursor)) });
      cursor.setDate(cursor.getDate() + stepDays);
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}
