# Apple Card Balance Tracking + Monthly Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each Apple Card account's `currentBalance` accumulate as transactions come in, and automatically reset to $0 the next time anyone in the household loads a page after the 1st of a new month (both cards are paid off in full every cycle).

**Architecture:** Two new nullable/defaulted columns on `accounts` (`resetBalanceMonthly`, `balanceMonth`) track which accounts opt into the behavior and which month their current balance represents. A single new lib function, `resetStaleMonthlyBalances(userId)`, is called from `getUser()` (already invoked on every authenticated request) and lazily zeroes out any household Apple Card account whose `balanceMonth` has fallen behind the current month — no cron/scheduler infrastructure needed. The ingest endpoint accumulates the balance on every new transaction using the same signed-amount convention already used for `transactions.amount`.

**Tech Stack:** Next.js API routes, Drizzle ORM (Postgres), hand-written SQL migrations applied manually (see `DATABASE.md` — this project does not use `drizzle-kit generate`/`migrate`). No test framework — verification via `npx tsc --noEmit`, a `tsx` script against the sandbox DB, and manual review of the login-triggered path.

## Global Constraints

- Local dev always runs against Plaid sandbox + the local `kabuki_sandbox` Postgres database (AGENTS.md / ENVIRONMENTS.md). Never point local dev at production.
- Migrations are hand-written SQL in `drizzle/00NN_description.sql`, applied to sandbox with `psql`, logged in `DATABASE.md`, and applied to production separately after deploy — never `drizzle-kit generate`/`migrate` (see `DATABASE.md`'s workflow section).
- `accounts.currentBalance` uses the existing app-wide sign convention: negative = amount owed for a liability account (confirmed against seed data and `getNetWorthTrend`, which sums `currentBalance` directly). `transactions.amount` already uses the same convention (negative = spend). Accumulation is therefore a direct sum — no sign-flipping.
- The reset check must never throw and break page loads if it fails — wrap it defensively and log, since it's a side effect of `getUser()`, not core to authentication.
- Run `npx tsc --noEmit -p .` after every task; it must pass with zero errors before moving to the next task.

---

## File Structure

New files:
- `drizzle/0026_apple_card_balance_tracking.sql` — adds `resetBalanceMonthly`, `balanceMonth` to `accounts`; backfills the two existing Apple Card accounts.
- `src/lib/balance-reset.ts` — `resetStaleMonthlyBalances(userId)`, the one new piece of logic everything else depends on.

Modified files:
- `src/db/schema.ts` — add the two new columns to the `accounts` table definition.
- `src/lib/auth.ts` — call `resetStaleMonthlyBalances` from `getUser()`.
- `src/app/api/v1/apple-card/route.ts` — accumulate `currentBalance`/stamp `balanceMonth` on every ingested transaction.
- `src/app/api/settings/apple-card/route.ts` — set `resetBalanceMonthly: true` when creating a new Apple Card account.
- `src/app/api/accounts/update/route.ts` — stamp `balanceMonth` when a balance is manually edited.
- `DATABASE.md` — log the new migration.
- `scripts/verify-apple-card-balance-reset.ts` — new ad hoc verification script (same convention as `scripts/verify-household-scoping.ts`).

---

### Task 1: Schema + migration

**Files:**
- Modify: `src/db/schema.ts` (the `accounts` table definition, currently ending at `updatedAt: timestamp(...)` before the closing `(table) => [...]` index block)
- Create: `drizzle/0026_apple_card_balance_tracking.sql`
- Modify: `DATABASE.md` (migration log table)

**Interfaces:**
- Produces: `accounts.resetBalanceMonthly: boolean` and `accounts.balanceMonth: string | null` — every later task reads/writes these via the Drizzle `accounts` schema object.

- [ ] **Step 1: Add the columns to the Drizzle schema**

In `src/db/schema.ts`, inside the `accounts` table definition, add two fields after `currentBalance` (before `availableBalance`):

```typescript
    currentBalance: numeric("current_balance", { precision: 16, scale: 2 }).notNull(),
    // Pay-in-full accounts (currently both Apple Cards) whose currentBalance
    // should zero out at the start of each new month — see balance-reset.ts.
    resetBalanceMonthly: boolean("reset_balance_monthly").default(false).notNull(),
    // 'YYYY-MM' of the month currentBalance currently represents. Null means
    // "never stamped yet" (freshly created/migrated account) — balance-reset.ts
    // treats that as nothing-to-reset rather than an immediate reset.
    balanceMonth: varchar("balance_month", { length: 7 }),
    availableBalance: numeric("available_balance", { precision: 16, scale: 2 }),
```

- [ ] **Step 2: Write the migration**

```sql
-- drizzle/0026_apple_card_balance_tracking.sql
-- Tracks which accounts should zero out monthly (pay-in-full cards) and
-- which month their currentBalance currently represents.
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS reset_balance_monthly boolean NOT NULL DEFAULT false;

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS balance_month varchar(7);

-- Opt the two existing Apple Card accounts into monthly reset. Their
-- balance_month stays null until the next transaction/reset touches them —
-- see resetStaleMonthlyBalances in src/lib/balance-reset.ts.
UPDATE accounts
SET reset_balance_monthly = true
WHERE name = 'Apple Card' AND is_manual = true AND liability_type = 'credit_card';
```

- [ ] **Step 3: Apply to the local sandbox DB and verify**

```bash
psql postgresql://localhost/kabuki_sandbox -f drizzle/0026_apple_card_balance_tracking.sql
psql postgresql://localhost/kabuki_sandbox -c "SELECT name, owner, reset_balance_monthly, balance_month FROM accounts WHERE name = 'Apple Card';"
```

Expected: two rows (Renato's and Claudia's Apple Card, if both exist in the sandbox seed — if the sandbox only seeded one, expect just that one), `reset_balance_monthly = t`, `balance_month` null.

- [ ] **Step 4: Log the migration in `DATABASE.md`**

Add a row to the migration log table:

```markdown
| 2026-08-07 | `0026_apple_card_balance_tracking.sql` | `accounts.reset_balance_monthly` + `accounts.balance_month` — lets pay-in-full cards (Apple Card) accumulate a balance through the month and zero out on the 1st |
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit -p .
```

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts drizzle/0026_apple_card_balance_tracking.sql DATABASE.md
git commit -m "feat: add accounts.resetBalanceMonthly and balanceMonth columns"
```

---

### Task 2: `resetStaleMonthlyBalances` — the reset logic

**Files:**
- Create: `src/lib/balance-reset.ts`

**Interfaces:**
- Consumes: `getHouseholdUserIds` from `src/lib/household.ts`, `accounts`/`plaidItems`/`accountBalanceHistory` from `@/db/schema`.
- Produces: `resetStaleMonthlyBalances(userId: string): Promise<void>` — Task 4 calls this from `getUser()`.

- [ ] **Step 1: Write the function**

```typescript
import { db } from '@/db';
import { accounts, plaidItems, accountBalanceHistory } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { generateId } from './id';
import { getHouseholdUserIds } from './household';

function currentMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Lazily zeroes out any household account marked resetBalanceMonthly whose
// balanceMonth has fallen behind the current month — called from getUser()
// on every authenticated request, so this runs "on login" without needing
// a separate cron/scheduler. A null balanceMonth (freshly created/migrated
// account) is left alone rather than treated as stale, since there's
// nothing meaningful to reset yet.
export async function resetStaleMonthlyBalances(userId: string): Promise<void> {
  const householdIds = await getHouseholdUserIds(userId);
  const householdItems = await db.query.plaidItems.findMany({
    where: inArray(plaidItems.userId, householdIds),
  });
  const itemIds = householdItems.map((item) => item.id);
  if (itemIds.length === 0) return;

  const candidates = await db.query.accounts.findMany({
    where: and(
      inArray(accounts.plaidItemId, itemIds),
      eq(accounts.resetBalanceMonthly, true)
    ),
  });

  const thisMonth = currentMonthKey();

  for (const account of candidates) {
    if (!account.balanceMonth || account.balanceMonth === thisMonth) continue;

    await db
      .update(accounts)
      .set({ currentBalance: '0', balanceMonth: thisMonth, updatedAt: new Date() })
      .where(eq(accounts.id, account.id));

    await db.insert(accountBalanceHistory).values({
      id: generateId(),
      accountId: account.id,
      balance: '0',
      recordedAt: new Date(),
    });
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit -p .
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/balance-reset.ts
git commit -m "feat: add resetStaleMonthlyBalances for household pay-in-full accounts"
```

---

### Task 3: Wire the reset into `getUser()`

**Files:**
- Modify: `src/lib/auth.ts`

**Interfaces:**
- Consumes: `resetStaleMonthlyBalances` from `src/lib/balance-reset.ts` (Task 2).

- [ ] **Step 1: Call it right after resolving `dbUser`, defensively**

In `src/lib/auth.ts`, add the import:

```typescript
import { resetStaleMonthlyBalances } from "./balance-reset";
```

Change the end of `getUser()` from:

```typescript
  if (!dbUser) {
    console.debug("[getUser] User not found in DB:", { email: session.user.email });
    return null;
  }

  return {
```

to:

```typescript
  if (!dbUser) {
    console.debug("[getUser] User not found in DB:", { email: session.user.email });
    return null;
  }

  try {
    await resetStaleMonthlyBalances(dbUser.id);
  } catch (error) {
    // Never let a balance-reset failure break auth resolution — this is a
    // side effect of login, not core to it.
    console.error("[getUser] resetStaleMonthlyBalances failed:", error);
  }

  return {
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit -p .
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: run the monthly balance reset check from getUser()"
```

---

### Task 4: Accumulate balance on every Apple Card transaction

**Files:**
- Modify: `src/app/api/v1/apple-card/route.ts`

**Interfaces:**
- Consumes: `accounts` from `@/db/schema`, `sql` from `drizzle-orm`.

- [ ] **Step 1: Add the imports**

Change:

```typescript
import { db } from '@/db';
import { integrationTokens, transactions, apiRequestLogs } from '@/db/schema';
import { eq, and, gte, count } from 'drizzle-orm';
```

to:

```typescript
import { db } from '@/db';
import { integrationTokens, transactions, apiRequestLogs, accounts } from '@/db/schema';
import { eq, and, gte, count, sql } from 'drizzle-orm';
```

- [ ] **Step 2: Accumulate the balance right after the transaction insert**

Locate the existing block (right after the `db.insert(transactions).values({...})` call):

```typescript
    await autoTagTransaction(integration.userId, transactionId, merchant);
    await db
      .update(integrationTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(integrationTokens.id, integration.id));
```

Add a balance update before the `autoTagTransaction` call, reusing the same signed amount already computed for the transaction row:

```typescript
    const signedAmount = isCredit ? Math.abs(amount) : -Math.abs(amount);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    await db
      .update(accounts)
      .set({
        currentBalance: sql`${accounts.currentBalance} + ${signedAmount}`,
        balanceMonth: monthKey,
      })
      .where(eq(accounts.id, integration.accountId));

    await autoTagTransaction(integration.userId, transactionId, merchant);
    await db
      .update(integrationTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(integrationTokens.id, integration.id));
```

Note the transaction insert a few lines above already computes `(isCredit ? Math.abs(amount) : -Math.abs(amount)).toString()` inline for `amount:` — leave that as-is; `signedAmount` here is a second, separate computation of the same value for reuse in the balance update, since the transaction insert doesn't store it in a variable.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit -p .
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/v1/apple-card/route.ts
git commit -m "feat: accumulate Apple Card account balance on every ingested transaction"
```

---

### Task 5: Opt new Apple Card accounts into monthly reset at creation time

**Files:**
- Modify: `src/app/api/settings/apple-card/route.ts`

**Interfaces:** none new — just setting a field already added in Task 1.

- [ ] **Step 1: Set `resetBalanceMonthly: true` on account creation**

In the `POST` handler, find the account-creation block:

```typescript
      await db.insert(accounts).values({
        id: newAccountId,
        plaidItemId: manualItem.id,
        plaidAccountId: `manual-${newAccountId}`,
        name: 'Apple Card',
        icon: 'CreditCard',
        owner,
        type: 'manual',
        subtype: 'credit card',
        kind: 'liability',
        liabilityType: 'credit_card',
        isManual: true,
        currentBalance: '0',
        currency: 'USD',
        isActive: true,
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
```

Add `resetBalanceMonthly: true,` (anywhere in the object — put it next to `currentBalance` for readability):

```typescript
      await db.insert(accounts).values({
        id: newAccountId,
        plaidItemId: manualItem.id,
        plaidAccountId: `manual-${newAccountId}`,
        name: 'Apple Card',
        icon: 'CreditCard',
        owner,
        type: 'manual',
        subtype: 'credit card',
        kind: 'liability',
        liabilityType: 'credit_card',
        isManual: true,
        currentBalance: '0',
        resetBalanceMonthly: true,
        currency: 'USD',
        isActive: true,
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit -p .
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/settings/apple-card/route.ts
git commit -m "feat: opt newly created Apple Card accounts into monthly balance reset"
```

---

### Task 6: Stamp `balanceMonth` on manual balance edits

**Files:**
- Modify: `src/app/api/accounts/update/route.ts`

**Interfaces:** none new.

This prevents a same-month manual correction (e.g. Renato notices the accumulated balance is off by a dollar and fixes it by hand) from being silently reset again by the next login within that same month — the manual edit re-stamps `balanceMonth` to the current month, same as the automatic accumulation path does.

- [ ] **Step 1: Stamp `balanceMonth` alongside the existing balance write**

Change:

```typescript
    const result = await db
      .update(accounts)
      .set({
        displayName: displayName || null,
        icon: icon || null,
        ...(owner && validOwners.includes(owner) ? { owner } : {}),
        ...(balanceChanged ? { currentBalance: currentBalance.toString() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, accountId))
      .returning();
```

to:

```typescript
    const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const result = await db
      .update(accounts)
      .set({
        displayName: displayName || null,
        icon: icon || null,
        ...(owner && validOwners.includes(owner) ? { owner } : {}),
        ...(balanceChanged ? { currentBalance: currentBalance.toString(), balanceMonth: monthKey } : {}),
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, accountId))
      .returning();
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit -p .
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/accounts/update/route.ts
git commit -m "feat: stamp balanceMonth on manual account balance edits"
```

---

### Task 7: End-to-end verification against the sandbox DB

**Files:**
- Create: `scripts/verify-apple-card-balance-reset.ts`

**Interfaces:** none — verification only.

- [ ] **Step 1: Write the verification script**

```typescript
// scripts/verify-apple-card-balance-reset.ts
// Run with: npx tsx scripts/verify-apple-card-balance-reset.ts
// Requires the local sandbox DB to already be seeded (npm run db:seed)
// and migration 0026 applied.
import { db } from '@/db';
import { accounts, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { resetStaleMonthlyBalances } from '@/lib/balance-reset';

async function main() {
  const renato = await db.query.users.findFirst({ where: eq(users.username, 'renato') });
  if (!renato) throw new Error('Seed data missing — run `npm run db:seed` first.');

  const appleCard = await db.query.accounts.findFirst({
    where: eq(accounts.name, 'Apple Card'),
  });
  if (!appleCard) throw new Error('No Apple Card account in sandbox — generate a token via Settings first.');

  // 1. Freshly created/migrated account: balanceMonth null -> no reset.
  await db.update(accounts).set({ currentBalance: '-42.50', balanceMonth: null }).where(eq(accounts.id, appleCard.id));
  await resetStaleMonthlyBalances(renato.id);
  let after = await db.query.accounts.findFirst({ where: eq(accounts.id, appleCard.id) });
  if (after?.currentBalance !== '-42.50') {
    throw new Error(`Expected null balanceMonth to be left alone, got currentBalance=${after?.currentBalance}`);
  }
  console.log('  ok: null balanceMonth is not treated as stale');

  // 2. Stale month -> reset to 0.
  await db.update(accounts).set({ currentBalance: '-42.50', balanceMonth: '2020-01' }).where(eq(accounts.id, appleCard.id));
  await resetStaleMonthlyBalances(renato.id);
  after = await db.query.accounts.findFirst({ where: eq(accounts.id, appleCard.id) });
  const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  if (after?.currentBalance !== '0.00' && after?.currentBalance !== '0') {
    throw new Error(`Expected stale balance to reset to 0, got ${after?.currentBalance}`);
  }
  if (after?.balanceMonth !== thisMonth) {
    throw new Error(`Expected balanceMonth to advance to ${thisMonth}, got ${after?.balanceMonth}`);
  }
  console.log('  ok: stale balanceMonth resets currentBalance to 0 and advances balanceMonth');

  // 3. Current month already -> no-op (balance untouched).
  await db.update(accounts).set({ currentBalance: '-10.00', balanceMonth: thisMonth }).where(eq(accounts.id, appleCard.id));
  await resetStaleMonthlyBalances(renato.id);
  after = await db.query.accounts.findFirst({ where: eq(accounts.id, appleCard.id) });
  if (after?.currentBalance !== '-10.00') {
    throw new Error(`Expected current-month balance to be left alone, got ${after?.currentBalance}`);
  }
  console.log('  ok: current-month balanceMonth is a no-op');

  console.log('balance-reset.ts: all checks passed');
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Ensure a sandbox Apple Card account exists, then run it**

If the sandbox seed doesn't already include an Apple Card account (check with `psql postgresql://localhost/kabuki_sandbox -c "SELECT name FROM accounts WHERE name = 'Apple Card';"`), generate one first by starting the dev server and using Settings > Integrations to generate a token for either owner — this also exercises Task 5's `resetBalanceMonthly: true` on creation, which the script itself doesn't check.

```bash
npm run env:sandbox
psql postgresql://localhost/kabuki_sandbox -c "SELECT name, reset_balance_monthly FROM accounts WHERE name = 'Apple Card';"
npx tsx scripts/verify-apple-card-balance-reset.ts
```

Expected: three `ok:` lines followed by `balance-reset.ts: all checks passed`.

- [ ] **Step 3: Manually verify the accumulation path**

```bash
npm run dev &
sleep 3
```

Get a real Apple Card token for Renato from Settings > Integrations in the browser (`http://localhost:3000/settings`), then:

```bash
curl -s "http://localhost:3000/api/v1/apple-card?token=<TOKEN>&transaction=Test%20Merchant&amount=12.34"
psql postgresql://localhost/kabuki_sandbox -c "SELECT current_balance, balance_month FROM accounts WHERE name = 'Apple Card' AND owner = 'renato';"
```

Expected: `current_balance` decreased by `12.34` from whatever it was, `balance_month` stamped to the current month.

```bash
pkill -f "next dev"
```

- [ ] **Step 4: Final full type-check and build**

```bash
npx tsc --noEmit -p .
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-apple-card-balance-reset.ts
git commit -m "test: add verification script for Apple Card balance tracking and reset"
```

---

## Self-Review Notes

- Every piece of the design spec has a task: schema (Task 1), reset logic (Task 2), login-triggered wiring (Task 3), accumulation (Task 4), opt-in at creation (Task 5), manual-edit consistency (Task 6), verification (Task 7).
- The `balanceMonth: null` → "leave alone" rule from the design doc is explicitly tested in Task 7 (case 1), not just implemented — this was the trickiest edge case (avoiding a spurious reset immediately after migration).
- Sign convention (negative = owed) is stated once in Global Constraints and referenced, not re-derived per task.
- No cron/scheduler files are created anywhere in this plan, matching the design's explicit choice to trigger via `getUser()` instead.
