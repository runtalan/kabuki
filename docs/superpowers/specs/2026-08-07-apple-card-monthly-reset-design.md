# Apple Card Balance Tracking + Monthly Reset Design

**Date:** 2026-08-07
**Goal:** Make each Apple Card account's `currentBalance` actually reflect what's been spent this month, and automatically zero it out at the start of each new month since both cards are paid off in full every cycle.

> **Superseded 2026-08-07 (same day, after initial implementation).** The "accumulate incrementally, then reset to $0 on the 1st" mechanism below shipped as designed, but the actual requirement is simpler and more robust: the balance should always just *be* the live sum of that calendar month's transactions — recomputed, not accumulated-and-reset. This avoids incremental-counter drift and needs no explicit reset step; a new month reads $0 because nothing has posted to it yet. The accumulation section, the "reset" framing throughout, and the `resetStaleMonthlyBalances` function name below are historical — the shipped code is `recomputeMonthlyBalance`/`refreshMonthlyBalances` in `src/lib/monthly-balance.ts`, which sums `transactions.amount` for the account's current calendar month (excluding hidden/transfer rows) on every ingest and on every `getUser()` call. The `resetBalanceMonthly`/`balanceMonth` columns and the login-triggered trigger point are unchanged from the design below — only the write itself changed from "increment then zero out" to "recompute the sum."

## Background

Both Renato and Claudia have an "Apple Card" account (`accounts.isManual = true`, `liabilityType = 'credit_card'`), fed by the Apple Card Sync ingest endpoint (`/api/v1/apple-card`, see the [household-wide-data-scoping design](./2026-08-07-household-wide-data-scoping-design.md) for how that pipeline works). Two gaps exist today:

1. **`accounts.currentBalance` never updates.** The ingest route inserts each new transaction but never touches the account's balance — it's permanently stuck at whatever it was set to on creation (`'0'`). So today there's nothing to "reset" — the balance is already always $0.
2. **No reset mechanism exists.** Since both cards are paid off in full every statement cycle, the balance should read $0 again at the start of each month, distinct from the transaction history itself (which stays intact for spending totals/budgets, which are already correctly monthly-scoped elsewhere).

## Design

### Balance accumulation

`accounts.currentBalance` for a liability account uses the existing app-wide convention: negative = amount owed (confirmed against seed data and `getNetWorthTrend`, which sums `currentBalance` directly into net worth). `transactions.amount` uses the same sign convention (negative = spend, positive = credit/refund) — so accumulating is a direct sum, no sign-flipping needed.

In `src/app/api/v1/apple-card/route.ts`, right after the transaction insert (and the existing `autoTagTransaction` call), add one more statement:

```typescript
await db
  .update(accounts)
  .set({ currentBalance: sql`${accounts.currentBalance} + ${amountToRecord}` })
  .where(eq(accounts.id, integration.accountId));
```

using the same signed amount already computed for the transaction row (`isCredit ? Math.abs(amount) : -Math.abs(amount)`).

### Opting an account into monthly reset

Add a new `accounts.resetBalanceMonthly` boolean column (default `false`). This is explicit opt-in rather than inferring "any manual credit_card account" — it only affects accounts intentionally marked as paid-in-full-every-cycle, and stays extensible if a third such account shows up later without accidentally sweeping in some other liability.

`src/app/api/settings/apple-card/route.ts`'s account-creation path sets `resetBalanceMonthly: true` when it creates a new Apple Card account. A one-time data migration backfills `resetBalanceMonthly = true` on the two existing Apple Card accounts (Renato's and Claudia's, both already in the database).

### Tracking "what month is this balance for"

Add `accounts.balanceMonth` (`varchar`, nullable, format `'YYYY-MM'`) — the month this account's `currentBalance` currently represents. Every write to `currentBalance` (the accumulation above, and any manual balance edit) also sets `balanceMonth` to the current month key, using the same local-server-time month math the rest of the codebase already uses for month boundaries (e.g. `queries.ts`'s `monthStart`/`monthEnd` — no new timezone handling introduced, for consistency).

### Triggering the reset — "on login," not a cron job

No scheduler infrastructure exists in this codebase, and per your call, this doesn't need one: the check runs as a side effect of `getUser()` (`src/lib/auth.ts`), which every authenticated request already calls to resolve the session. Right after resolving `dbUser`, for each of that user's `resetBalanceMonthly` accounts:

- Compute the current month key.
- If `accounts.balanceMonth` is set and differs from the current month key, reset: set `currentBalance = '0'`, `balanceMonth = <current month key>`, and record an `accountBalanceHistory` row (matching the existing pattern in `src/app/api/accounts/manual/route.ts`) so the balance-over-time chart on the account page shows the drop back to zero rather than a silent jump.
- If `balanceMonth` is null (freshly created/migrated account) or already matches the current month key, do nothing.

This makes the check as cheap as a string comparison on every request, with an actual DB write only on the rare request that crosses a month boundary — no separate infrastructure, and "on login" falls out naturally since login is what calls `getUser()` in the first place. Because `getUser()` re-resolves the household member from their own row, the check only ever touches the accounts belonging to the user who's actually logged in at that moment — Claudia's card resets whenever she (or, since accounts are now household-wide, Renato) next loads any page after the 1st, not on a fixed clock tick.

### Out of scope

- A "true" cron/Cloud Scheduler job — deliberately not built; the login-triggered check is the whole mechanism.
- Any change to the manual "edit account balance" flow (`/api/accounts/update`) beyond also stamping `balanceMonth` when it writes `currentBalance`, so a manual correction doesn't get silently reset later in the same month.
- Changing how monthly spending totals/budgets are computed — those already scope by transaction date correctly and are untouched by this balance-display feature.

## Testing

- Simulate a transaction landing via `/api/v1/apple-card` and confirm `accounts.currentBalance` decreases (more owed) by the transaction amount, `balanceMonth` is stamped to the current month.
- Simulate crossing a month boundary (seed `balanceMonth` to the previous month, then call `getUser()`) and confirm `currentBalance` resets to `'0'`, `balanceMonth` advances, and an `accountBalanceHistory` row is recorded.
- Confirm an account with `resetBalanceMonthly = false` (or unset) is never touched by the reset logic, regardless of `balanceMonth`.
- Confirm a manual balance edit via `/api/accounts/update` on an Apple Card account also stamps `balanceMonth`, so it isn't immediately overwritten by the next login within the same month.
