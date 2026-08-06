// Date-only strings ("2026-08-20") parse as UTC midnight via `new Date()`.
// Anywhere west of UTC, formatting that with local getters (or comparing it
// against local-time transaction timestamps) reads back a day early. Use
// these instead of `new Date(dateOnlyString)` for anything that came from a
// <input type="date"> or a "YYYY-MM-DD" URL param.

export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// End of the given day in local time (23:59:59.999) — the correct upper
// bound for an inclusive date-range filter. Using `parseLocalDate(end)`
// alone as the upper bound would put the boundary at local midnight,
// excluding nearly all of the end date itself.
export function endOfLocalDay(iso: string): Date {
  const d = parseLocalDate(iso);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Parses a "YYYY-MM" search param (the ?month= convention shared by the
// Spending and Cash Flow month toggles) into the first-of-month Date it
// refers to, falling back to the real current month for anything missing
// or malformed.
export function parseMonthParam(value: string | undefined): Date {
  if (value) {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      if (month >= 0 && month <= 11) return new Date(year, month, 1);
    }
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Inverse of parseMonthParam — formats a Date as "YYYY-MM" for the URL.
export function toMonthParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
