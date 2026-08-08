# Mark transaction as recurring (from the Transaction Modal)

## Problem

Kabuki already has a full recurring-transactions subsystem: the `recurring_series`
table, a heuristic detector (`getRecurringItems` in `src/lib/spending-insights.ts`),
a merge layer (`getRecurringEntries` in `src/lib/recurring.ts`), and a dedicated
Recurring page with a review queue. But there's no way to act on recurrence from
the Transaction Modal (`src/components/transaction-edit-modal.tsx`) where a user
is already looking at one transaction. This adds that bridge: a "Recurring" toggle
in the modal that confirms or dismisses the transaction's merchant as a recurring
series, using the same detection heuristics the rest of the app already relies on.

## Non-goals

- No changes to the `transactions` table or any per-row "is recurring" flag.
  Recurrence stays merchant-scoped via `recurring_series`, exactly as it works
  today on the Recurring page.
- No new UI on the Recurring page itself — this only adds an entry point from
  the modal.

## Data model

No schema changes. Recurrence membership continues to be determined purely by
`normalizeMerchant(tx.merchant || tx.name)` matching `recurringSeries.merchantKey`
— confirming a series for one transaction's merchant means every past/future
transaction with that merchant is considered part of the series, with no writes
to individual transaction rows.

## Library: `estimateRecurrence`

New function in `src/lib/spending-insights.ts`, alongside `getRecurringItems`
and reusing its `FREQUENCY_BUCKETS` table:

```ts
function estimateRecurrence(
  txs: { date: Date; amount: string; categoryId: string | null }[]
): { frequency: Frequency; amount: number; nextDate: Date; categoryId: string | null; isIncome: boolean }
```

- **1 transaction**: `frequency = 'monthly'`, `nextDate` = one month after that
  transaction's date (same day-of-month), `amount`/`categoryId`/`isIncome` taken
  directly from it. Matches the user's stated behavior: "if it's the only
  transaction that's occurred, assume it occurs on the same date."
- **≥2 transactions**: same median-gap-to-bucket lookup `getRecurringItems`
  already uses (sort by date, compute gaps, median gap, match against
  `FREQUENCY_BUCKETS`), but **without** the strict fit-ratio (≥60% of gaps in
  bucket range) or amount-consistency (≥60% of amounts within 35% of median)
  gates that `getRecurringItems` applies. Those gates exist so the automatic
  detector doesn't flag noisy data uninvited; here the user is explicitly
  asking to mark this merchant recurring, so we give a best-effort estimate
  instead of refusing. If the median gap doesn't fall in any bucket range,
  fall back to whichever bucket's midpoint is closest. `amount`/`categoryId`
  come from the most recent transaction (mirrors `getRecurringItems`'s
  `latest` usage); `nextDate` = latest date + median gap (rounded).

`getRecurringItems` is unchanged — it keeps its strict gates for passive
detection. `estimateRecurrence` is a separate, more permissive path used only
when the user actively confirms.

## API: `src/app/api/transactions/[id]/recurring/route.ts`

New route, auth via `getUser()` / `assertWriteAccess()` like every other
mutating route in this codebase.

### `GET`

Loads the transaction (404 if not found or outside the household). Computes
`merchantKey = normalizeMerchant(tx.merchant || tx.name)`. Looks up the
existing `recurringSeries` override row for that key and whether the merchant
appears in `getRecurringItems()`'s live-detected list, using the same merge
rule as `getRecurringEntries`: recurring if an override exists with
`status='confirmed'`, or if detected with no `dismissed` override.

```ts
{ isRecurring: boolean; frequency: Frequency | null; nextDate: string | null } // nextDate: ISO yyyy-mm-dd
```

### `POST` — body `{ action: 'confirm' | 'dismiss' }`

Loads the transaction the same way; 400 if `normalizeMerchant(...)` key length
< 3 (mirrors `getRecurringItems`'s own guard — nothing meaningful to track).

**confirm:**
- If the merchant is in `getRecurringItems()`'s detected list: upsert
  `{status: 'confirmed', isManual: false}` on the override row (create if
  none exists), leaving `frequency`/`amount`/`nextDate` untouched so
  `getRecurringEntries` keeps inheriting the live-detected values —
  identical semantics to the existing `/api/recurring/review` confirm path.
- Otherwise: fetch all household transactions matching `merchantKey` (no
  1-year window — unlike `getRecurringItems`, this must find the transaction
  being edited even if it's old), run `estimateRecurrence`, and upsert
  `{status: 'confirmed', isManual: true, frequency, amount, categoryId,
  nextDate, isIncome, merchantName}`.

**dismiss:**
- Upsert `{status: 'dismissed'}` on the existing override row, or insert a
  minimal dismissed row (`merchantKey`, `merchantName`, `isManual: false`) if
  none exists — so a merchant that later accumulates enough transactions to
  pass detection doesn't resurface despite the user saying no. Applies
  uniformly regardless of `isManual`; this is a lighter-weight action than the
  Recurring page's own delete button (which deletes manual rows outright) —
  the modal toggle should always be reversible.

Both actions respond with the same shape as `GET`.

## Modal UI (`transaction-edit-modal.tsx`)

New toggle row placed immediately after the Category section (both are
merchant-wide classification actions, grouped with "Auto-tag rule" which
follows it):

```
Recurring                                    [toggle]
Monthly · next Aug 15                          (subtext, only when confirmed)
Applies to every transaction from this merchant, not just this one.
```

- On mount, alongside the existing `/api/tags` fetch, fire
  `GET /api/transactions/{id}/recurring` to initialize local state
  `{isRecurring, frequency, nextDate}` (loading state: toggle disabled).
- Toggling calls `POST .../recurring` with `confirm`/`dismiss`. Uses its own
  `savingRecurring` flag (separate from the transaction `persist()` flow,
  since it's a different endpoint) and a `role="switch"` control styled like
  the existing "Hide transaction" toggle.
- On success, update local state from the response (frequency/nextDate
  label). No `router.refresh()` — nothing else on this panel depends on other
  transactions, and the Recurring page reads fresh on its own next load.
- On failure, show inline red error text under the row (same style as the
  rule-creation error) and revert the toggle to its prior state.
- Subtext formatting reuses `FREQUENCY_LABELS` and `isoDay`/date formatting
  already available from `recurring-shared.ts`.

## Testing

No existing test framework was found for this route style during exploration;
confirm during planning whether one exists before deciding on automated
coverage. At minimum, manually verify: toggling on for a merchant with 2+
consistent past transactions preserves detected frequency; toggling on for a
merchant with exactly 1 transaction (this one) creates a monthly series
anchored on its date; toggling off removes the merchant from the Recurring
page; re-toggling on after a dismiss re-confirms rather than duplicating rows.
