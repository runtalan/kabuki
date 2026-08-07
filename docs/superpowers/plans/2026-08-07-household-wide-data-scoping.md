# Household-Wide Data Scoping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every household read/ownership-check in Kabuki span both Renato's and Claudia's `users.id`, so either login sees and can edit the full shared household financial picture (fixing the bug where Claudia's Apple Card transactions never appeared under Renato's login), while keeping the demo account fully isolated.

**Architecture:** A single new helper, `getHouseholdUserIds(userId)`, expands a `users.id` into every id sharing its household (both real users for `renato`/`claudia`, just itself for `demo` or anyone else). Every place that currently does `eq(plaidItems.userId, someUserId)` (or the equivalent on `rules.userId`/`recurringSeries.userId`, or a `!== user.id` ownership check) switches to the `inArray`/membership form using this expansion. Write paths (which `users.id` a new row attaches to) are untouched.

**Tech Stack:** Next.js API routes, Drizzle ORM (Postgres), no test framework in this repo — verification is via `npx tsc --noEmit`, a small ad hoc `tsx` verification script run against the local sandbox DB (matching the existing `scripts/seed-watchlist.ts` convention), and a final curl-based end-to-end check against the local dev server (sandbox only — never production).

## Global Constraints

- Local dev always runs against Plaid sandbox + the local `kabuki_sandbox` Postgres database. Never point local dev at production. (AGENTS.md / ENVIRONMENTS.md)
- Never submit real credentials against the **live production** login endpoint. The local sandbox dev server is fine to test against with the seeded local password.
- The demo account (`isDemo: true`) must never see or be merged with real household (`renato`/`claudia`) data, in either direction.
- Household membership is `['renato', 'claudia']` — looked up from the `users` table by username, not hardcoded ids (so it survives a database reseed).
- Write paths (which user id a newly created row attaches to) do not change in this plan — only read/ownership-check scoping changes.
- Run `npx tsc --noEmit -p .` after every task; it must pass with zero errors before moving to the next task.

---

## File Structure

New files:
- `src/lib/household.ts` — the household-membership resolver, the one piece of new logic everything else calls.
- `scripts/verify-household-scoping.ts` — ad hoc verification script (run manually via `npx tsx`, not part of any CI/test suite — this repo has none).

Modified files (grouped by task below):
- `src/lib/auth.ts`, `src/lib/queries.ts`, `src/lib/spending-insights.ts`, `src/lib/recurring.ts`, `src/lib/auto-tag.ts`
- `src/app/api/transactions/route.ts`, `src/app/api/transactions/[id]/route.ts`, `src/app/api/accounts/route.ts`, `src/app/api/accounts/[id]/route.ts`, `src/app/api/accounts/[id]/history/route.ts`, `src/app/api/accounts/manual/[id]/route.ts`, `src/app/api/accounts/update/route.ts`, `src/app/api/accounts/institution/[id]/route.ts`, `src/app/api/accounts/disconnect/route.ts`, `src/app/api/accounts/refresh/route.ts`, `src/app/api/dev-log/route.ts`, `src/app/api/plaid/sync/route.ts`
- `src/app/api/recurring/route.ts`, `src/app/api/recurring/[id]/route.ts`, `src/app/api/recurring/review/route.ts`
- `src/app/api/rules/route.ts`, `src/app/api/rules/[id]/route.ts`, `src/app/api/rules/reorder/route.ts`

---

### Task 1: Household resolver + wire into `getUser()`

**Files:**
- Create: `src/lib/household.ts`
- Modify: `src/lib/auth.ts` (the `AuthUser` interface and `getUser()` body, lines 6–42)
- Create: `scripts/verify-household-scoping.ts`

**Interfaces:**
- Produces: `getHouseholdUserIds(userId: string): Promise<string[]>` from `src/lib/household.ts` — every later task imports this.
- Produces: `AuthUser.householdUserIds: string[]` — every API route task that already calls `getUser()` relies on this field being present.

- [ ] **Step 1: Write `src/lib/household.ts`**

```typescript
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

// The two real household logins. `demo` and any future non-household user
// are deliberately excluded — they stay isolated to just themselves.
export const HOUSEHOLD_USERNAMES: readonly string[] = ['renato', 'claudia'];

// Expands a user id into every user id that shares its household. For
// renato/claudia this is always both of them (so either login sees the
// full shared financial picture); for anyone else (the demo account, or a
// future non-household user) it's just themselves — never merged with real
// household data in either direction.
export async function getHouseholdUserIds(userId: string): Promise<string[]> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || !HOUSEHOLD_USERNAMES.includes(user.username)) {
    return [userId];
  }

  const householdUsers = await db.query.users.findMany({
    where: inArray(users.username, HOUSEHOLD_USERNAMES),
  });
  return householdUsers.map((u) => u.id);
}
```

- [ ] **Step 2: Wire it into `getUser()` in `src/lib/auth.ts`**

Add `householdUserIds: string[]` to the `AuthUser` interface (after `isDemo: boolean;`), import `getHouseholdUserIds` from `./household`, and populate it in `getUser()`'s return:

```typescript
import { getHouseholdUserIds } from "./household";
// ... existing imports stay

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  isDemo: boolean;
  householdUserIds: string[];
}

// ... inside getUser(), replace the final `return { ... }` with:
  return {
    id: dbUser.id,
    email: dbUser.email,
    username: dbUser.username,
    isDemo: dbUser.isDemo,
    householdUserIds: await getHouseholdUserIds(dbUser.id),
  };
```

- [ ] **Step 3: Write the verification script**

```typescript
// scripts/verify-household-scoping.ts
// Run with: npx tsx scripts/verify-household-scoping.ts
// Requires the local sandbox DB to already be seeded (npm run db:seed).
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getHouseholdUserIds } from '@/lib/household';

async function main() {
  const renato = await db.query.users.findFirst({ where: eq(users.username, 'renato') });
  const claudia = await db.query.users.findFirst({ where: eq(users.username, 'claudia') });
  const demo = await db.query.users.findFirst({ where: eq(users.username, 'demo') });
  if (!renato || !claudia || !demo) {
    throw new Error('Seed data missing — run `npm run db:seed` against the sandbox DB first.');
  }

  const fromRenato = new Set(await getHouseholdUserIds(renato.id));
  const fromClaudia = new Set(await getHouseholdUserIds(claudia.id));
  const fromDemo = new Set(await getHouseholdUserIds(demo.id));

  assertEqual(fromRenato, new Set([renato.id, claudia.id]), 'renato -> household');
  assertEqual(fromClaudia, new Set([renato.id, claudia.id]), 'claudia -> household');
  assertEqual(fromDemo, new Set([demo.id]), 'demo -> isolated');

  console.log('household.ts: all checks passed');
}

function assertEqual(actual: Set<string>, expected: Set<string>, label: string) {
  const a = [...actual].sort().join(',');
  const e = [...expected].sort().join(',');
  if (a !== e) throw new Error(`${label}: expected [${e}], got [${a}]`);
  console.log(`  ok: ${label}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 4: Run it against the local sandbox DB**

```bash
npm run env:sandbox   # confirm local env is sandbox, per AGENTS.md — never run env:production locally
npm run db:seed
npx tsx scripts/verify-household-scoping.ts
```

Expected output: three `ok:` lines followed by `household.ts: all checks passed`.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit -p .
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/household.ts src/lib/auth.ts scripts/verify-household-scoping.ts
git commit -m "feat: add household-membership resolver and wire into getUser()"
```

---

### Task 2: `src/lib/queries.ts` — household-wide spending/accounts/cash-flow/net-worth reads

**Files:**
- Modify: `src/lib/queries.ts` (6 occurrences of `eq(plaidItems.userId, userId)` at lines 28, 48, 124, 219, 303, 383)
- Modify: `scripts/verify-household-scoping.ts` (extend)

**Interfaces:**
- Consumes: `getHouseholdUserIds` from `src/lib/household.ts` (Task 1).
- Produces: no signature changes — `getUserAccounts`, `getSpendingByCategory`, `getCashFlowData`, `getCashFlowSeries`, `getMonthTransactions`, `getRecentTransactions`, `getNetWorthTrend` all keep taking a single `userId: string` as their first argument; they now internally expand it to the household before querying, so no caller anywhere in the app needs to change.

- [ ] **Step 1: Import the helper**

At the top of `src/lib/queries.ts`, add:

```typescript
import { getHouseholdUserIds } from './household';
```

- [ ] **Step 2: Replace every `eq(plaidItems.userId, userId)` with the household-expanded form**

For each of the 6 occurrences (`getUserAccounts` line 28, `getSpendingByCategory` line 48, `getCashFlowData` line 124, `getCashFlowSeries` line 219, `getMonthTransactions` line 303, `getRecentTransactions`/`getNetWorthTrend` line 383), change:

```typescript
where: eq(plaidItems.userId, userId),
```

to:

```typescript
where: inArray(plaidItems.userId, await getHouseholdUserIds(userId)),
```

`inArray` is already imported at the top of this file (line 8). Double check each call site is inside an `async function` (all six already are).

- [ ] **Step 3: Extend the verification script to cover spending/accounts**

Append to `scripts/verify-household-scoping.ts`, before the final `console.log('household.ts: all checks passed')`:

```typescript
  const { getUserAccounts, getSpendingByCategory } = await import('@/lib/queries');

  const renatoAccounts = await getUserAccounts(renato.id);
  const claudiaAccounts = await getUserAccounts(claudia.id);
  const renatoNames = new Set(renatoAccounts.map((a) => a.name));
  const claudiaNames = new Set(claudiaAccounts.map((a) => a.name));

  if (!renatoNames.has('Claudia Checking')) {
    throw new Error('getUserAccounts(renato.id) should include Claudia\'s seeded checking account');
  }
  if (!claudiaNames.has('Renato Checking')) {
    throw new Error('getUserAccounts(claudia.id) should include Renato\'s seeded checking account');
  }
  console.log('  ok: getUserAccounts is household-wide in both directions');

  const demoAccounts = await getUserAccounts(demo.id);
  if (demoAccounts.some((a) => a.name === 'Claudia Checking' || a.name === 'Renato Checking')) {
    throw new Error('getUserAccounts(demo.id) leaked real household accounts');
  }
  console.log('  ok: getUserAccounts stays isolated for the demo account');

  await getSpendingByCategory(renato.id); // smoke test — must not throw
  console.log('  ok: getSpendingByCategory(renato.id) runs without error');
```

- [ ] **Step 4: Run the script and type-check**

```bash
npx tsx scripts/verify-household-scoping.ts
npx tsc --noEmit -p .
```

Expected: all `ok:` lines print, script exits 0, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries.ts scripts/verify-household-scoping.ts
git commit -m "feat: make queries.ts spending/accounts/cash-flow/net-worth reads household-wide"
```

---

### Task 3: `src/lib/spending-insights.ts` — recurring-detection reads

**Files:**
- Modify: `src/lib/spending-insights.ts` (line 17, `eq(plaidItems.userId, userId)`)

**Interfaces:**
- Consumes: `getHouseholdUserIds` (Task 1).
- Produces: no signature change (same pattern as Task 2).

- [ ] **Step 1: Import the helper and check the existing `inArray` import**

```typescript
import { getHouseholdUserIds } from './household';
```

Confirm `inArray` is already imported from `drizzle-orm` in this file; add it to the existing import if not.

- [ ] **Step 2: Replace the scoping line**

Change:

```typescript
where: eq(plaidItems.userId, userId),
```

to:

```typescript
where: inArray(plaidItems.userId, await getHouseholdUserIds(userId)),
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit -p .
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/spending-insights.ts
git commit -m "feat: make spending-insights.ts recurring detection household-wide"
```

---

### Task 4: `src/lib/recurring.ts` and `src/lib/auto-tag.ts` — recurring overrides, rules, smart-tagging

**Files:**
- Modify: `src/lib/recurring.ts` (`getRecurringEntries`, line 17)
- Modify: `src/lib/auto-tag.ts` (`autoTagTransaction` line 41, `findMatchingTransactions` line 84, `runSmartCategorization` line 129)

**Interfaces:**
- Consumes: `getHouseholdUserIds` (Task 1).
- Produces: no signature changes to any of these four functions — all keep taking a single `userId: string`.

This matters for the originally-reported bug: `autoTagTransaction` is called right after every Apple Card ingest to categorize the new transaction against the caller's rules. Today it only checks the token owner's own rules (`rules.userId = userId`), so a rule Renato created never auto-categorizes Claudia's Apple Card purchases. Making it household-wide fixes that too.

- [ ] **Step 1: `src/lib/recurring.ts` — household-wide recurring overrides**

Add the import:

```typescript
import { getHouseholdUserIds } from './household';
```

Change line 17 from:

```typescript
db.query.recurringSeries.findMany({ where: eq(recurringSeries.userId, userId) }),
```

to:

```typescript
db.query.recurringSeries.findMany({ where: inArray(recurringSeries.userId, await getHouseholdUserIds(userId)) }),
```

Add `inArray` to the existing `drizzle-orm` import in this file (currently only imports `eq`).

- [ ] **Step 2: `src/lib/auto-tag.ts` — household-wide rules and transaction scans**

Add the import:

```typescript
import { getHouseholdUserIds } from './household';
```

In `autoTagTransaction` (line 41), change:

```typescript
where: eq(rules.userId, userId),
```

to:

```typescript
where: inArray(rules.userId, await getHouseholdUserIds(userId)),
```

In `findMatchingTransactions` (line 84), change:

```typescript
const rows = await db.query.plaidItems.findMany({
  where: (item, { eq: eqOp }) => eqOp(item.userId, userId),
```

to:

```typescript
const householdIds = await getHouseholdUserIds(userId);
const rows = await db.query.plaidItems.findMany({
  where: (item, { inArray: inArrayOp }) => inArrayOp(item.userId, householdIds),
```

In `runSmartCategorization` (line 129), apply the same change:

```typescript
const householdIds = await getHouseholdUserIds(userId);
const rows = await db.query.plaidItems.findMany({
  where: (item, { inArray: inArrayOp }) => inArrayOp(item.userId, householdIds),
```

Add `inArray` to this file's top-level `drizzle-orm` import (currently `eq, and`) — needed for the `rules.userId` change above.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit -p .
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/recurring.ts src/lib/auto-tag.ts
git commit -m "feat: make recurring overrides, rule matching, and smart-tagging household-wide"
```

---

### Task 5: API routes with direct `plaidItems.userId` scoping

**Files:**
- Modify: `src/app/api/transactions/route.ts` (line 27)
- Modify: `src/app/api/accounts/route.ts` (line 26)
- Modify: `src/app/api/dev-log/route.ts` (line 14)
- Modify: `src/app/api/plaid/sync/route.ts` (line 16)

**Interfaces:**
- Consumes: `user.householdUserIds` from `getUser()`/`requireUser()` (Task 1) for the three routes that already call one of those. `src/app/api/accounts/route.ts` does **not** call `getUser()` — it resolves the session manually via `auth()` + a raw `db.query.users.findFirst` lookup — so it needs a direct call to `getHouseholdUserIds` from `src/lib/household.ts` (Task 1) instead.

`src/app/api/transactions/route.ts`, `src/app/api/dev-log/route.ts`, and `src/app/api/plaid/sync/route.ts` already resolve `user` via `getUser()` or `requireUser()` (both from `@/lib/auth`) before this line runs, so `user.householdUserIds` is already available there.

- [ ] **Step 1: `src/app/api/transactions/route.ts`**

Change line 27 from:

```typescript
where: eq(plaidItems.userId, user.id),
```

to:

```typescript
where: inArray(plaidItems.userId, user.householdUserIds),
```

`inArray` is already imported in this file (line 4).

- [ ] **Step 2: `src/app/api/accounts/route.ts`**

This file resolves the user manually (`const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) })`), so it has no `householdUserIds` field. Add the import:

```typescript
import { getHouseholdUserIds } from "@/lib/household";
```

Change line 26 from:

```typescript
where: eq(plaidItems.userId, user.id),
```

to:

```typescript
where: inArray(plaidItems.userId, await getHouseholdUserIds(user.id)),
```

Add `inArray` to this file's `drizzle-orm` import (currently only `eq`).

- [ ] **Step 3: `src/app/api/dev-log/route.ts`**

Change line 14 the same way. `inArray` is already imported (line 4).

- [ ] **Step 4: `src/app/api/plaid/sync/route.ts`**

Change line 16 the same way. Add `inArray` to this file's `drizzle-orm` import (currently only `eq`).

This means clicking "Sync" while logged in as either Renato or Claudia now re-syncs every real Plaid connection in the household, not just the caller's own — intentional per the shared-edit-access decision, since Claudia has no real bank connections of her own to sync anyway today.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit -p .
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/transactions/route.ts src/app/api/accounts/route.ts src/app/api/dev-log/route.ts src/app/api/plaid/sync/route.ts
git commit -m "feat: make transactions/accounts/dev-log/plaid-sync listing routes household-wide"
```

---

### Task 6: API routes with single-resource `!== user.id` ownership checks

**Files:**
- Modify: `src/app/api/accounts/[id]/route.ts` (line 23)
- Modify: `src/app/api/accounts/manual/[id]/route.ts` (line 25)
- Modify: `src/app/api/accounts/[id]/history/route.ts` (line 23)
- Modify: `src/app/api/accounts/update/route.ts` (line 29)
- Modify: `src/app/api/accounts/institution/[id]/route.ts` (line 31)
- Modify: `src/app/api/transactions/[id]/route.ts` (lines 30 and 65)

**Interfaces:**
- Consumes: `user.householdUserIds` from `getUser()` (Task 1) — all six of these routes already call `getUser()` before the ownership check.

This is what makes "full shared edit access" real: Claudia editing/categorizing a transaction that lives under Renato's Chase connection (or vice versa) is now allowed, because the ownership check tests household membership instead of exact identity.

- [ ] **Step 1: `src/app/api/accounts/[id]/route.ts`**

Change line 23 from:

```typescript
if (!account || account.plaidItem.userId !== user.id) {
```

to:

```typescript
if (!account || !user.householdUserIds.includes(account.plaidItem.userId)) {
```

- [ ] **Step 2: `src/app/api/accounts/manual/[id]/route.ts`**

Apply the identical change at line 25 (same `account.plaidItem.userId !== user.id` pattern).

- [ ] **Step 3: `src/app/api/accounts/[id]/history/route.ts`**

Apply the identical change at line 23.

- [ ] **Step 4: `src/app/api/accounts/update/route.ts`**

Change line 29 from:

```typescript
if (!existing || existing.plaidItem.userId !== user.id) {
```

to:

```typescript
if (!existing || !user.householdUserIds.includes(existing.plaidItem.userId)) {
```

- [ ] **Step 5: `src/app/api/accounts/institution/[id]/route.ts`**

This one checks `plaidItems.userId` directly (no `.plaidItem` nesting, since the resource fetched *is* the plaid item). Change line 31 from:

```typescript
if (!existing || existing.userId !== user.id) {
```

to:

```typescript
if (!existing || !user.householdUserIds.includes(existing.userId)) {
```

- [ ] **Step 6: `src/app/api/transactions/[id]/route.ts`**

Change both occurrences — line 30:

```typescript
if (!tx || tx.account.plaidItem.userId !== user.id) {
```

becomes:

```typescript
if (!tx || !user.householdUserIds.includes(tx.account.plaidItem.userId)) {
```

and line 65:

```typescript
if (!existing || existing.account.plaidItem.userId !== user.id) {
```

becomes:

```typescript
if (!existing || !user.householdUserIds.includes(existing.account.plaidItem.userId)) {
```

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit -p .
```

- [ ] **Step 8: Commit**

```bash
git add src/app/api/accounts/[id]/route.ts src/app/api/accounts/manual/[id]/route.ts src/app/api/accounts/[id]/history/route.ts src/app/api/accounts/update/route.ts src/app/api/accounts/institution/[id]/route.ts src/app/api/transactions/[id]/route.ts
git commit -m "feat: make single-account/transaction ownership checks household-wide"
```

---

### Task 7: `disconnect` and `refresh` routes (don't use `getUser()`)

**Files:**
- Modify: `src/app/api/accounts/disconnect/route.ts` (line 40)
- Modify: `src/app/api/accounts/refresh/route.ts` (line 41)

**Interfaces:**
- Consumes: `getHouseholdUserIds` directly from `src/lib/household.ts` (Task 1) — these two routes resolve the user via a raw `db.query.users.findFirst` call instead of `getUser()`, so they don't have `householdUserIds` handed to them; call the helper directly instead of refactoring them onto `getUser()` (out of scope for this plan).

- [ ] **Step 1: `src/app/api/accounts/disconnect/route.ts`**

Add the import:

```typescript
import { getHouseholdUserIds } from "@/lib/household";
```

Change line 40 from:

```typescript
if (!item || item.userId !== user.id) {
```

to:

```typescript
if (!item || !(await getHouseholdUserIds(user.id)).includes(item.userId)) {
```

- [ ] **Step 2: `src/app/api/accounts/refresh/route.ts`**

Apply the identical change at line 41 (same `item.userId !== user.id` pattern), with the same import added.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit -p .
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/accounts/disconnect/route.ts src/app/api/accounts/refresh/route.ts
git commit -m "feat: make disconnect/refresh ownership checks household-wide"
```

---

### Task 8: Recurring routes

**Files:**
- Modify: `src/app/api/recurring/route.ts` (line 15, `getRecurringEntries(user.id)` — already fixed transitively by Task 4, no change needed here beyond confirming it)
- Modify: `src/app/api/recurring/[id]/route.ts` (lines 21 and 77, `eq(recurringSeries.userId, user.id)` inside the ownership `where`)
- Modify: `src/app/api/recurring/review/route.ts` (line 29, `eq(recurringSeries.userId, user.id)`)

**Interfaces:**
- Consumes: `user.householdUserIds` (Task 1).

- [ ] **Step 1: Confirm `src/app/api/recurring/route.ts` needs no change**

Line 15 (`getRecurringEntries(user.id)`) and line 54 (`userId: user.id` on insert) are unaffected: the read already became household-wide inside `getRecurringEntries` in Task 4, and the insert intentionally stays attached to the acting user. No edit needed in this file — just confirm by reading it that these are the only two `user.id` occurrences.

- [ ] **Step 2: `src/app/api/recurring/[id]/route.ts`**

Add the import:

```typescript
import { inArray } from 'drizzle-orm'; // add to the existing drizzle-orm import if `and`/`eq` are already imported there
```

Change both occurrences (lines 21 and 77) from:

```typescript
where: and(eq(recurringSeries.id, id), eq(recurringSeries.userId, user.id)),
```

to:

```typescript
where: and(eq(recurringSeries.id, id), inArray(recurringSeries.userId, user.householdUserIds)),
```

- [ ] **Step 3: `src/app/api/recurring/review/route.ts`**

Change line 29's `eq(recurringSeries.userId, user.id)` (inside an `and(...)` — read the surrounding code first to preserve the other conditions) to `inArray(recurringSeries.userId, user.householdUserIds)`, adding `inArray` to the file's `drizzle-orm` import. Leave line 47's `userId: user.id` (the insert-on-review-decision path) unchanged — new overrides still attach to whoever's actually reviewing.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit -p .
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/recurring/route.ts src/app/api/recurring/[id]/route.ts src/app/api/recurring/review/route.ts
git commit -m "feat: make recurring series ownership checks household-wide"
```

---

### Task 9: Rules routes

**Files:**
- Modify: `src/app/api/rules/route.ts` (line 16, `eq(rules.userId, user.id)`)
- Modify: `src/app/api/rules/[id]/route.ts` (lines 32 and 64, `eq(rules.userId, user.id)` inside `where(and(...))`)
- Modify: `src/app/api/rules/reorder/route.ts` (line 38, `eq(rules.userId, user.id)` inside `where(and(...))`)

**Interfaces:**
- Consumes: `user.householdUserIds` (Task 1).

- [ ] **Step 1: `src/app/api/rules/route.ts`**

Change line 16 from:

```typescript
where: eq(rules.userId, user.id),
```

to:

```typescript
where: inArray(rules.userId, user.householdUserIds),
```

Add `inArray` to the file's `drizzle-orm` import. Leave line 55's `userId: user.id` (insert on rule creation) and line 69's `applyRuleToExistingTransactions(user.id, ...)` unchanged — the former is a write (stays attached to the creator), the latter was already made household-wide transitively in Task 4 via `findMatchingTransactions`.

- [ ] **Step 2: `src/app/api/rules/[id]/route.ts`**

Change both occurrences (lines 32 and 64) from:

```typescript
.where(and(eq(rules.id, id), eq(rules.userId, user.id)))
```

to:

```typescript
.where(and(eq(rules.id, id), inArray(rules.userId, user.householdUserIds)))
```

Add `inArray` to the file's `drizzle-orm` import.

- [ ] **Step 3: `src/app/api/rules/reorder/route.ts`**

Change line 38 the same way:

```typescript
.where(and(eq(rules.id, update.id), eq(rules.userId, user.id)));
```

becomes:

```typescript
.where(and(eq(rules.id, update.id), inArray(rules.userId, user.householdUserIds)));
```

`inArray` is already imported in this file (line 4) — no import change needed.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit -p .
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/rules/route.ts src/app/api/rules/[id]/route.ts src/app/api/rules/reorder/route.ts
git commit -m "feat: make rules ownership checks household-wide"
```

---

### Task 10: End-to-end verification against the local sandbox dev server

**Files:** none (verification only — no code changes)

**Interfaces:** none.

- [ ] **Step 1: Confirm sandbox environment and start the dev server**

```bash
npm run env:sandbox
npm run db:seed
npm run dev &
sleep 3
```

- [ ] **Step 2: Log in as Renato and capture his session cookie**

```bash
COOKIE_JAR=$(mktemp)
CSRF=$(curl -s -c "$COOKIE_JAR" http://localhost:3000/api/auth/csrf | node -e "process.stdin.once('data', d => console.log(JSON.parse(d).csrfToken))")
curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST http://localhost:3000/api/auth/callback/credentials \
  -d "csrfToken=$CSRF&username=renato&password=br0wnC0wb1!&json=true" > /dev/null
```

- [ ] **Step 3: Confirm Claudia's seeded account is visible under Renato's login**

```bash
curl -s -b "$COOKIE_JAR" http://localhost:3000/api/accounts | grep -o '"Claudia Checking"'
```

Expected: `"Claudia Checking"` printed. This is the direct fix for the reported bug — under the old scoping, this would print nothing.

- [ ] **Step 4: Confirm Renato's own transactions still include his seeded data (no regression)**

```bash
curl -s -b "$COOKIE_JAR" http://localhost:3000/api/transactions | grep -o '"hasMore"'
```

Expected: `"hasMore"` printed (i.e. the endpoint returns a well-formed response, not an error).

- [ ] **Step 5: Repeat from Claudia's side**

```bash
COOKIE_JAR_C=$(mktemp)
CSRF_C=$(curl -s -c "$COOKIE_JAR_C" http://localhost:3000/api/auth/csrf | node -e "process.stdin.once('data', d => console.log(JSON.parse(d).csrfToken))")
curl -s -b "$COOKIE_JAR_C" -c "$COOKIE_JAR_C" -X POST http://localhost:3000/api/auth/callback/credentials \
  -d "csrfToken=$CSRF_C&username=claudia&password=br0wnC0wb1!&json=true" > /dev/null
curl -s -b "$COOKIE_JAR_C" http://localhost:3000/api/accounts | grep -o '"Renato Checking"'
```

Expected: `"Renato Checking"` printed — confirms the fix works in both directions, not just Renato-sees-Claudia.

- [ ] **Step 6: Confirm demo isolation still holds**

```bash
COOKIE_JAR_D=$(mktemp)
CSRF_D=$(curl -s -c "$COOKIE_JAR_D" http://localhost:3000/api/auth/csrf | node -e "process.stdin.once('data', d => console.log(JSON.parse(d).csrfToken))")
curl -s -b "$COOKIE_JAR_D" -c "$COOKIE_JAR_D" -X POST http://localhost:3000/api/auth/callback/credentials \
  -d "csrfToken=$CSRF_D&username=demo&password=demopassword123&json=true" > /dev/null
curl -s -b "$COOKIE_JAR_D" http://localhost:3000/api/accounts | grep -oE '"Claudia Checking"|"Renato Checking"' || echo "none found (expected)"
```

Expected: `none found (expected)` — confirms the demo account still never sees real household data. (If the seeded demo password differs from `demopassword123`, check `DEMO_PASSWORD` in `src/db/seed.ts` and use that value instead.)

- [ ] **Step 7: Stop the dev server and clean up**

```bash
kill %1
rm -f "$COOKIE_JAR" "$COOKIE_JAR_C" "$COOKIE_JAR_D"
```

- [ ] **Step 8: Final full type-check and build**

```bash
npx tsc --noEmit -p .
npm run build
```

Expected: both succeed with no errors — confirms nothing in this refactor broke the production build.

No commit for this task (verification only).

---

## Self-Review Notes

- Every file identified in the original codebase audit (`plaidItems.userId` grep + `!== user.id` grep + `rules.userId`/`recurringSeries.userId` grep) has a task. Investments/Alpaca/watchlist are intentionally excluded per the design spec's "Out of Scope" section.
- Write paths (`getOrCreateManualPlaidItem`, every `userId: user.id` on an insert) are explicitly called out as unchanged in each task where they appear nearby, so an implementer doesn't accidentally "fix" them too.
- `src/lib/manual-accounts.ts` is deliberately not a task — it's a write-path helper (`getOrCreateManualPlaidItem(userId)`) and stays exactly as-is per the design.
