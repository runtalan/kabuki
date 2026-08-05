# Overnight Progress Report

Autonomous audit/refactor/test run, effort level: medium. Base commit `6a7552d`, final commit `e3ba80c`. 18 files changed across 7 commits (see §7 for a post-hand-off fix added after the user asked to double-check the Recurring summary).

**Landing page**: confirmed untouched — `git diff 6a7552d..HEAD -- src/components/landing-page.tsx src/components/interactive-app-demo.tsx` is empty.

**Verification method used throughout**: `npx tsc --noEmit -p .` + `npm run build` after every change (both clean at every commit), plus live requests against the running dev server (`curl` with an authenticated session cookie) and, for two changes, direct behavioral tests — a Node script replicating client-side logic against real API responses, and a live failure-injection test (temporarily disabling an API route file, confirming the failure path fires, restoring it). No headless-browser screenshot tool was available in this environment, so nothing here was verified by eyeballing a rendered screenshot — see "Not independently verified" below.

---

## 1. Budget Performance This Year — drill-down (commit `f4870f4`)

**Was:** `src/components/spending/budget-view.tsx` rendered a hardcoded 12-entry array (`{ name: 'Jan', budget: 1900, spent: 1720, variance: 180 }, ...`) with a hardcoded tooltip year of "2024" that didn't match any real year. No click behavior on month cells.

**Now:**
- `getMonthlyBudgetHistory(userId, monthsBack=12)` added to `src/lib/spending-insights.ts` — real trailing-12-month spend per month, computed from actual transactions against categories that currently have a budget set. Months with zero transaction activity are flagged `hasData: false` and rendered as a distinct grey "no data" state instead of a misleading $0-under-budget month.
- Each month cell with data is now a button. Clicking navigates to `/spending/transactions?start=<month-start>&end=<month-end>`.
- Stats panel ("Months on Track" / "Months Over Budget" / "Average Variance") now counts only months with real data, and is explicit that variance is "vs today's budget" (there's no historical budget snapshot — see Known Limitation below).

**Verified:** ran `getMonthlyBudgetHistory` directly against the sandbox DB — confirmed real dates (Sep 2025–Aug 2026, not hardcoded), correct `hasData` flags matching actual transaction coverage, and correct variance math after setting a real budget on a category with real spend ($323 budget, $43.98 spent → $279.02 variance, verified by hand).

## 2. Transactions page — filter breakdowns + wired drill-down (commit `f4870f4`)

**Now:**
- Transactions page reads `?start=&end=&category=` from the URL via `useSearchParams` (wrapped in `<Suspense>`, required for static export) to pre-fill the date range and category filter — this is what the Budget drill-down link lands on.
- Added mini "By Category" and "Top Merchants" breakdown panels, shown whenever any filter is active (category/owner/type/tag/search/date range/time-range), computed client-side from the currently-filtered transaction set.

**Bug found and fixed in the same commit:** the existing custom date-range filter parsed date-only strings (`"2026-08-07"`) with `new Date(...)`, which parses as **UTC midnight**. For the *end* boundary specifically, this put the cutoff at local-midnight-minus-timezone-offset instead of end of day — anyone west of UTC would silently lose most of the range's last day. Verified concretely: a transaction the UI displays as "Aug 7" (timestamp `2026-08-08T06:56:03Z`, which is `2026-08-07 23:56 PDT`) was excluded from a `start=end=2026-08-07` filter under the old logic and correctly included under the new logic. Fixed via new `src/lib/date.ts` (`parseLocalDate` / `endOfLocalDay`), applied to both the filter logic and the two date-range display strings that had the same parsing issue.

## 3. Recurring tab (commit `f4870f4`, `1e0e760`)

**Real data:** confirmed no hardcoded data existed on this tab — `getRecurringEntries` / `getRecurringItems` (built in the prior session, before this autonomous run) already derive recurring series from actual transaction history via interval/amount-consistency heuristics. Nothing to replace here.

**Calendar day-click (new, commit `f4870f4`):** day cells with occurrences are now clickable, opening a `DayDetailModal` listing every recurring charge landing on that date with a per-row dismiss (trash icon) button. Dismissing reuses the existing `remove()` path (DELETE for manual entries, `POST /api/recurring/review {status:"dismissed"}` for detected ones).

**Bug found and fixed in the same commit:** `remove()` returned `void` even when the user cancelled the browser `confirm()` dialog. The day-modal's "close the modal if that was the last occurrence for the day" logic would have fired on a *cancelled* dismissal, closing the modal even though nothing was removed. `remove()` now returns whether it actually removed the entry (`Promise<boolean>`), and the modal only reacts on `true`.

**Empty state (commit `1e0e760`):** previously, zero recurring transactions still rendered a full empty calendar grid (all dashes), with the only explanation buried in the bottom of the "Summary" card. Replaced with a dedicated `RecurringEmptyState`: icon, plain-language explanation of what detection looks for and why it needs a few billing cycles, and an "Add one manually" CTA. Verified `getRecurringEntries()` returns `[]` for a user with no accounts (the actual gating condition), and confirmed the live page with real sandbox data does *not* render the empty-state copy.

## 4. General audit findings — fixed

- **Settings page, hardcoded username:** the page literally rendered the string `"renato"` regardless of who was logged in — Claudia would see "renato" too. Fixed to read the real session, matching the pattern already used in the sidebar.
- **Settings page, dead "Change password" button:** had no `onClick` at all. Built `POST /api/user/password` (verifies current password via `bcrypt.compare` before writing a new hash — this is a shared-household credentials login with no email-reset flow, so the current-password check is the only guard against an unlocked session being hijacked) and a modal form. **Verified end-to-end** against the live sandbox account: wrong current password → 400 rejected; correct change → 200, old password subsequently rejected; then reverted the account back to the documented `renato`/`password` credentials so nothing else in the environment breaks.
- **Silent initial-load fetch failures** on Accounts, Categories, Rules, and Transactions: each page's initial `fetch()` either only `console.error`'d on a thrown exception, or silently ignored a non-2xx response entirely (no `else` branch) — a failed load looked identical to "you genuinely have zero rows," with no way to retry short of a full reload. Added a shared `FetchErrorBanner` component and wired a `loadError` flag into all four pages' existing fetch functions (set on failure, cleared on the next success), with a Retry button that re-invokes the same fetch. **Verified with real failure injection:** temporarily renamed `src/app/api/rules/route.ts` to break the endpoint, confirmed a live request against it returns 404 (`rulesRes.ok === false`) — exactly the condition that flips `loadError` to `true` — then restored the file and confirmed the route 200s again.
- **No error boundary or 404 page anywhere in the app:** a render-time exception on any page fell through to Next's bare default error screen; a bad/stale link hit the default Next 404. Added `src/app/error.tsx` (App Router error boundary — there are no nested `error.tsx` files, so this covers the entire app; offers Try Again / Go to Home, logs the error, shows the message in development only) and `src/app/not-found.tsx` (styled 404, same visual language). Verified: an unmatched route on the live dev server returns a real 404 status with the new page's content.

## 5. Audited, found clean (no changes needed)

- **Sidebar + PageTabs navigation:** every `href` in both resolves to a real `page.tsx` — checked programmatically, not by inspection.
- **All internal `Link`/`router.push` targets app-wide** (including template-literal ones like `/accounts/${id}`, `/merchants/${name}`): all point to routes that exist (`[id]`/`[name]` dynamic segments confirmed present).
- **`/reports`, `/dashboard`, `/transactions`:** these are intentional redirect shims from a prior nav restructure (`redirect('/spending')`, `redirect('/home')`, `redirect('/spending/transactions')`) — not broken, working as designed.
- **No other hardcoded/mock data found** app-wide via grep for TODO/FIXME/mock/dummy/placeholder markers, aside from the landing page's demo data (intentionally out of scope per instructions).
- **`/rules` page's inline form panel** doesn't use a `fixed inset-0` modal overlay, so it correctly wasn't included in the Escape-key-closes-modals pattern applied to actual overlays elsewhere in the app.

## 6. Documentation updated

- `README.md`: added `hooks/` to the project structure listing, and a new "Error handling" section documenting `error.tsx`, `not-found.tsx`, and `FetchErrorBanner`.
- `DATABASE.md`: **not modified** — no schema changes were made this session (no new migration; `getMonthlyBudgetHistory` and the password-change endpoint are pure query/API additions with no new columns or tables), so the existing migration log is still accurate as of `0012_recurring_series.sql`.

## 7. Post-hand-off fix: Recurring summary counted unconfirmed detections as fact (commit `e3ba80c`)

The user asked "is the summary on recurring correct?" after reading this report. It wasn't — found a real bug, not just a wording nit.

The Summary sentence ("Your recurring income of $X/mo comfortably covers $Y/mo in recurring bills..."), the "Monthly outflow"/"Monthly income" totals, the calendar's per-day dollar amounts, and "Upcoming this month" were all computed from the full `entries` list — which includes detections still sitting unanswered in the "Is this recurring?" review queue (`needsReview: true`). A detection is a same-merchant/roughly-steady-interval guess; the review queue exists specifically to catch false positives before they're treated as settled. Instead, an unconfirmed item's full monthly cost was silently folded into the headline totals and the natural-language summary before the user ever answered Yes/No on it.

**Fixed:** added `confirmedEntries = entries.filter(e => !e.needsReview)`, switched the calendar, upcoming list, bills/income totals, and Summary sentence to derive from it. The List view still intentionally shows every entry including pending ones (that's where the review queue lives) — added a "Pending review" badge there so it's clear why an item isn't in the totals.

**Verified by reproducing the exact bug, not just re-reading the code:** deleted the `recurring_series` row for "Rocket Mortgage" in the sandbox DB (putting it back into unconfirmed/`needsReview` state), confirmed via a live request that the rendered Summary sentence's monthly outflow dropped from $2,789/mo to $727/mo and the bill count from 5 to 4 — i.e., confirmed Rocket Mortgage's $2,062.24/mo really had been counted while unconfirmed — then confirmed it still correctly appears in the "Is this recurring?" queue, then restored it via the review API.

## Known limitation (by design, not a bug)

Budget Performance's month-over-month variance compares each historical month's real spend against **today's** budget total, not whatever the budget was at the time (there's no historical budget snapshot in the schema — `categories.monthly_budget` is a single current value). This is called out directly in the UI copy ("vs. today's budget"). Adding true historical budget versioning would need a new table and is a larger scope call than this pass — logged here rather than done silently, per the operating rules.

## Blockers

None reached the threshold for `overnight-blockers.md` — it exists but is empty aside from its header. Every ambiguous call made (see "Known limitation" above, and the choice to reuse the existing `remove()` confirm-dialog UX for calendar-day dismissal rather than building a separate no-confirm flow) is documented inline in the relevant commit message rather than deferred.

## Not independently verified (tooling gap, not skipped)

No working headless-browser/screenshot tool was available in this environment (confirmed via several failed attempts earlier in the session). Everything above was verified by: TypeScript compilation, full production build, live HTTP requests against the running dev server with a real authenticated session, direct database queries against the sandbox DB, and — for the two most state-dependent changes (date-boundary fix, fetch-error-banner) — scripted reproductions of the exact client-side logic against real server responses. Nothing was verified purely by visual/eyeball inspection of a rendered page; if a visual regression exists in spacing, alignment, or color that wouldn't show up in HTML structure or computed values, it would not have been caught here.
