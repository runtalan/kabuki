# Household-Wide Data Scoping Design

**Date:** 2026-08-07
**Goal:** Make financial data visible and editable by both household logins (Renato and Claudia), fixing the bug where Claudia's Apple Card transactions never appear in Spending > Transactions or budgets.

## Background / Root Cause

Kabuki has two real user logins (`renato`, `claudia`) plus an isolated `demo` account. Every data-reading query in the app scopes strictly to the logged-in session's own `users.id`:

```
plaidItems.userId = session.user.id  →  accounts.plaidItemId  →  transactions.accountId
```

The `OwnerToggle` component (shown on Home, Spending, and Transactions) is documented in its own code comment as a "household-wide 'who's spending' filter" — but no query actually merges the two users' data. Each login only ever sees accounts hanging off its own `plaidItems` rows.

This was invisible until now because Claudia has no real Plaid-linked bank accounts of her own — her only account is a manually-tracked "Apple Card" created via `src/app/api/settings/apple-card/route.ts`, which (correctly, per that route's own comment: "either can manage both from a shared Settings page") attaches to whichever user the card belongs to (`claudia`), not whoever is generating the token. Verified live in production: her Apple Card account and its transactions are correctly formed (right sign, `hidden=false`, `transfer_type` null, current month) — they simply live under a `plaidItems` row owned by her `users.id`, which Renato's session never queries, and vice versa.

This is a general household-scoping gap, not an Apple-Card-specific bug — any account either person creates or links only shows up under their own login today.

## Design

### Household resolution

Add a household concept centered on `src/lib/auth.ts`, where `getUser()` already resolves the session into `{id, email, username, isDemo}`.

- A `HOUSEHOLD_USERNAMES = ['renato', 'claudia']` constant (mirrors the existing `OWNERS` list in the Apple Card settings route).
- `getUser()`'s returned object gains `householdUserIds: string[]`:
  - For `renato`/`claudia`: the `users.id`s of **both** household usernames, looked up from the `users` table.
  - For `demo`: just `[demo-user-id]` — the demo sandbox must never merge with real household data or vice versa.
- This keeps the household membership as data (looked up from `users`, not hardcoded ids), so it survives a re-seed.

### Read-path changes

Every query that currently filters `plaidItems` (or joins through it) by `eq(plaidItems.userId, user.id)` switches to `inArray(plaidItems.userId, user.householdUserIds)`. This covers:

- `src/lib/queries.ts` — `getUserAccounts`, `getSpendingByCategory`, `getCashFlowData`, `getCashFlowSeries`, `getMonthTransactions`, `getRecentTransactions`, `getNetWorthTrend`
- `src/lib/spending-insights.ts`
- `/api/transactions`, `/api/transactions/[id]`, `/api/transactions/smart-tag`
- `/api/accounts`, `/api/accounts/[id]`, `/api/accounts/[id]/history`, `/api/accounts/manual`, `/api/accounts/manual/[id]`, `/api/accounts/update`, `/api/accounts/disconnect`, `/api/accounts/refresh`, `/api/accounts/institution/[id]`
- `/api/recurring`, `/api/recurring/[id]`, `/api/recurring/review`
- `/api/rules`, `/api/rules/[id]`, `/api/rules/reorder`
- `/api/watchlist`
- `/api/investments/*` (holdings, orders, portfolio-summary, alpaca-positions)
- `/api/plaid/sync` (each Plaid item still syncs with its own stored `accessToken`; only the *listing/lookup* of which items belong to "this household" changes)

Ownership-check helpers used before mutating a specific resource (e.g. "does this account/transaction id belong to this user") switch the same way, from an equality check against `user.id` to a membership check against `user.householdUserIds` — this is what makes full shared edit access work (see below).

### Write-path: unchanged

New records (manual accounts, Apple Card tokens, rules, recurring series, etc.) keep attaching to whichever `users.id` is actually acting — `getOrCreateManualPlaidItem(user.id)` and similar calls are untouched. Nothing needs to change here: once reads are household-wide, it no longer matters which of the two household users a given row is physically attached to — both logins see it. The `accounts.owner` field (`renato`/`claudia`/`joint`) remains the label the `OwnerToggle` filters on, fully decoupled from `plaidItems.userId`.

### Shared edit access

Per your call: either household member can edit/categorize/tag/hide anything in the household (transactions, accounts, budgets, rules), not just their own. Since write-path ownership checks are switching to the same `inArray(householdUserIds)` membership test as reads, this falls out of the same change — no separate permission layer needed.

### Demo account isolation

The demo account (`isDemo: true`) must stay fully isolated — its `householdUserIds` is just its own id, never merged with `renato`/`claudia`. This preserves the existing `assertWriteAccess` demo-blocking behavior and prevents demo data from ever leaking into (or receiving) real household data.

### Out of scope

- The Apple Card monthly "$0 out on the 1st" reset — separate follow-up spec.
- Any change to how `accounts.owner` is set or displayed — the `OwnerToggle` filter UI itself needs no changes; it already assumed this scoping existed.
- Plaid sync mechanics (access tokens, webhook handling) — unaffected; only the household-membership lookup changes.

## Testing

- Verify, per changed route/query: a resource created under one household login (e.g. Claudia's Apple Card, or a new manual account created while logged in as Claudia) is now visible and editable when logged in as Renato, and vice versa.
- Verify demo login (`isDemo: true`) still only ever sees/affects its own seeded data, with zero crossover to `renato`/`claudia` data.
- Verify the existing per-owner `OwnerToggle` filter (`?owner=renato|claudia|joint`) still correctly filters the now-merged household dataset by the `accounts.owner` label.
- Spot-check the specific reported bug: Claudia's existing two Apple Card transactions (AMC Metreon, Lululemon) appear in Renato's Spending > Transactions and in the current month's spending-by-category totals.
