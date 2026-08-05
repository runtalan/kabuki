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
