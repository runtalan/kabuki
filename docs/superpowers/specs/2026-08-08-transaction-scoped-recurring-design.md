# Transaction-Scoped Recurring Override — Design

This supersedes the "Recurring" section of
`docs/superpowers/specs/2026-08-08-mark-transaction-recurring-design.md`
(already implemented on `mark-transaction-recurring`, not yet merged). That
version's toggle wrote to the merchant-keyed `recurring_series` table, so
confirming one transaction retroactively affected every past/future
transaction from that merchant. This spec replaces that mechanism with a
true per-transaction override, and adds a frequency editor. Everything else
from the original spec (API shape conventions, no auto-tag-rule changes,
etc.) still applies except where called out below.

## Problem

Toggling "Recurring" on a transaction in the edit modal should only affect
*that transaction*. The existing automatic pattern detection
(`getRecurringItems` in `src/lib/spending-insights.ts`) already looks at a
merchant's full history and flags it as recurring on its own — that
behavior is unchanged by this feature. This feature is for the cases
detection didn't catch (too few occurrences, irregular gaps) or where the
user wants to record their own expectation for one specific transaction,
without that decision bleeding into siblings from the same merchant.

## Non-goals

- No changes to `recurring_series`, `getRecurringItems`, or the existing
  merchant-level confirm/dismiss flow on `/spending/recurring`.
- No changes to auto-tag rules.
- Bulk/multi-transaction editing is out of scope.

## Data model

New table, `transaction_recurring` — one row per transaction:

```ts
export const transactionRecurring = pgTable(
  "transaction_recurring",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    transactionId: varchar("transaction_id", { length: 36 })
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    frequency: varchar("frequency", { length: 20 }).notNull(), // weekly | biweekly | monthly | yearly | custom
    intervalDays: integer("interval_days"), // set only when frequency = 'custom'
    nextDate: timestamp("next_date").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_transaction_recurring_transaction_id").on(table.transactionId),
    index("idx_transaction_recurring_user_id").on(table.userId),
  ]
);
```

Amount, category, and income/expense direction are **not** stored — they're
read live off the linked `transactions` row at query time, since this row
represents exactly one transaction rather than an abstract pattern (unlike
`recurring_series`, which has to snapshot those fields because it
represents many transactions that can vary).

`frequency` gains a `'custom'` member on top of the existing
`Frequency` union in `src/lib/recurring-shared.ts` (currently `'weekly' |
'biweekly' | 'monthly' | 'yearly'`). `'custom'` always pairs with
`intervalDays` (a plain "every N days" cadence). `occurrencesInMonth` and
`PER_MONTH` need a branch/entry for it:
- `PER_MONTH` (`Record<Frequency, number>`) can't hold a fixed constant for
  `'custom'` since the cadence varies per entry via `intervalDays`. Replace
  every `PER_MONTH[frequency]` lookup (both in `src/lib/recurring.ts`, the
  only two call sites) with a new `perMonthFactor(frequency, intervalDays?)`
  helper in `recurring-shared.ts` that returns `PER_MONTH[frequency]` for
  the four fixed cadences and `30.44 / intervalDays` for `'custom'`.
  `PER_MONTH` itself keeps its existing four-entry type (fixed cadences
  only) and stays as the lookup table the new helper wraps.
- `occurrencesInMonth`'s weekly/biweekly branch already steps by a fixed
  `stepDays` from an anchor date — extend it to also handle `'custom'` by
  using `entry.intervalDays` as `stepDays` (new optional `intervalDays`
  field on `RecurringEntry`).

## Toggle semantics (`GET /api/transactions/[id]/recurring`)

Checkbox state is `isRecurring = hasOverrideRow || isAutoDetected`:
- `hasOverrideRow`: a `transaction_recurring` row exists for this exact
  transaction id.
- `isAutoDetected`: `getRecurringItems(user.id)` contains an entry whose
  `merchantKey` matches this transaction's normalized merchant (existing
  logic, reused as-is).

When ON for either reason, the frequency/next-date shown (and editable) is:
1. The override row's values, if one exists.
2. Otherwise the auto-detected item's `frequency`/`nextDate`.
3. Otherwise (manual toggle, no detection, no row yet) the
   `estimateRecurrence` estimate against this merchant's full household
   history (existing function, unchanged) — single occurrence defaults to
   monthly, multiple occurrences use the median-gap bucket.

Editing the frequency (see below) always creates/updates the override row
for this transaction, even if the merchant was already auto-detected —
the override then takes precedence per rule 1 above.

## API

`GET /api/transactions/[id]/recurring` — returns:
```ts
{
  isRecurring: boolean;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom' | null;
  intervalDays: number | null; // set only when frequency === 'custom'
  nextDate: string | null; // ISO yyyy-mm-dd
  source: 'override' | 'detected' | 'estimate'; // which of the 3 tiers above produced these values
}
```
`source` lets the modal show an "auto-detected" hint vs. a plain estimate,
and tells it whether Edit Frequency is showing a live override or a
suggestion.

`POST /api/transactions/[id]/recurring` — body:
```ts
{ action: 'confirm' | 'dismiss' | 'update';
  frequency?: 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
  intervalDays?: number; // required when frequency === 'custom'
  nextDate?: string; } // ISO yyyy-mm-dd
```
- `confirm`: no `frequency`/`nextDate` given → insert an override row
  using the same 3-tier estimate as GET (detected values if auto-detected,
  else `estimateRecurrence`). Used when the user flips the toggle on
  without touching Edit Frequency.
- `update`: requires `frequency` + `nextDate` (+ `intervalDays` for
  `custom`) → upsert (insert or update) the override row with exactly
  those values. Used when the user edits the frequency picker/date field,
  whether the toggle was already on or this is what turns it on.
- `dismiss`: delete the override row for this transaction, if one exists.
  If the merchant is still auto-detected, the next `GET` will show the
  toggle back ON via `source: 'detected'` — this is expected (see
  "Turning off" below) and mirrors how the existing merchant-level page
  already works for detected-but-unconfirmed items.

400s: `frequency === 'custom'` without a positive integer `intervalDays`;
missing/invalid `nextDate` on `update`; unknown `action`.

Response shape matches `GET`'s.

## Turning off vs. detection

Dismissing only ever deletes this transaction's override row — it never
writes to `recurring_series` and never affects other transactions. If
`getRecurringItems` still detects the merchant as recurring independently,
the checkbox will show ON again next time the modal opens
(`source: 'detected'`). To truly stop a merchant from being detected at
all, the user uses the existing dismiss action on `/spending/recurring`
(unchanged, merchant-level, out of scope here). This is a deliberate
scope split: this modal control is about *this transaction's* record,
detection/dismissal of a *merchant pattern* stays where it already lives.

## Modal UI (`src/components/transaction-edit-modal.tsx`)

Same toggle row/position as currently implemented, with additions:
- Subtext changes from static frequency text to include the `source`
  hint: `"Monthly · next Sep 15"` (override/detected) or
  `"Estimated monthly · next Sep 15"` (estimate, not yet saved).
- Below the toggle, when `isRecurring` is true, an always-visible **Edit
  Frequency** section:
  - A frequency select: Weekly / Biweekly / Monthly / Annual / Other.
  - When "Other" is selected, a number input for "every N days" instead of
    the frequency select's remaining space.
  - A next-date input (native `<input type="date">`), defaulting to the
    current `nextDate` from GET.
  - Fields are pre-filled from the current GET response (override,
    detected, or estimate) and are always editable, per the "always
    visible once recurring is on" decision.
  - Saves on blur/change (debounced or on-change is fine, following
    whatever pattern is simplest given the existing `toggleRecurring`
    fetch pattern) via `POST { action: 'update', frequency, intervalDays?,
    nextDate }`.
- Toggling off calls `POST { action: 'dismiss' }` as today, and hides the
  Edit Frequency section (still shown again immediately if detection flips
  it back ON per the rule above).
- Existing error/loading state handling (`recurringError`,
  `savingRecurring`) is reused for the new update calls.

## Recurring page (`/spending/recurring`)

`getRecurringEntries` (`src/lib/recurring.ts`) gains a third source
alongside detected items and `recurring_series` manual entries: household
`transaction_recurring` rows, joined to their transaction for merchant
name/amount/category/income-flag. Each becomes its own `RecurringEntry`
(`isManual: true`, `id` = the transaction id so the UI can link back to
it), independent of and additional to any merchant-level entry for the
same merchant — they represent different scopes (one transaction vs. the
whole pattern) and are both shown. No changes to `RecurringView` beyond
whatever `RecurringEntry.intervalDays` rendering `occurrencesInMonth`
needs (frequency label already falls through `FREQUENCY_LABELS`, which
needs a `custom: 'Custom'` entry, or a dynamic label like
`"Every {N} days"` computed where displayed).

## Testing

No test framework exists in this repo (confirmed during the original
feature's implementation). Verification is:
- `npx tsc --noEmit` and `npx eslint` on touched files.
- Manual DB-level verification of `estimateRecurrence`'s existing logic is
  already covered from the original implementation; new coverage needed
  for the override CRUD paths (`update`, `dismiss` deleting only this
  transaction's row, `custom` interval validation) via ad-hoc scripts
  against the local sandbox DB, mirroring how the original route was
  verified.
- `npm run build` to confirm the route/migration compile end-to-end.
- Real browser click-through is still out of reach for me (Google-OAuth-only
  login) — flagged explicitly, not silently skipped.
