# Transaction-Scoped Recurring Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the merchant-wide "Recurring" toggle in the transaction edit modal with a true per-transaction override, and add an always-visible "Edit Frequency" control (weekly/biweekly/monthly/annual/custom-day-interval + next date).

**Architecture:** A new `transaction_recurring` table (one row per transaction) sits alongside the existing merchant-keyed `recurring_series` table without touching it. `GET/POST /api/transactions/[id]/recurring` resolves toggle state through two tiers — an explicit override row, else the existing auto-detection heuristic — and `POST` `confirm`/`update`/`dismiss` actions write only to this transaction's row. `getRecurringEntries` (powers `/spending/recurring`) gains a third entry source from this table; the Recurring page's list/menu code needs small fixes since it's about to see, for the first time, multiple entries sharing the same `merchantKey`.

**Tech Stack:** Next.js 16 App Router API routes, Drizzle ORM / Postgres, React 19 client components. No test framework exists in this repo — verification is `tsc --noEmit`, `eslint`, `npm run build`, and ad-hoc scripts against the local `kabuki_sandbox` database.

## Global Constraints

- Local dev only: sandbox DB (`kabuki_sandbox`), never touch production during implementation/verification.
- Migrations are hand-written SQL in `drizzle/`, applied manually — see `DATABASE.md`. No `drizzle-kit generate`.
- `Frequency` (`src/lib/recurring-shared.ts`) gains a `'custom'` member; every existing exhaustive usage of that union must be updated to compile, not just new code.
- No changes to `recurring_series`, `getRecurringItems`, or the merchant-level confirm/dismiss flow.

---

### Task 1: `transaction_recurring` table + migration

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0027_transaction_recurring.sql`
- Modify: `DATABASE.md`

**Interfaces:**
- Produces: `transactionRecurring` Drizzle table (columns: `id`, `transactionId`, `userId`, `frequency`, `intervalDays`, `nextDate`, `createdAt`, `updatedAt`), consumed by Tasks 3 and 4.
- Produces: `transactionRecurringRelations` with a `transaction: one(transactions, ...)` relation, so `db.query.transactionRecurring.findMany({ with: { transaction: true } })` works in Task 4.

- [ ] **Step 1: Add the table to `src/db/schema.ts`**

Insert directly after the `recurringSeries` block (after the closing `);` that follows its indexes, before the `integrationTokens` table comment):

```ts
// Per-transaction recurring override — independent of recurring_series.
// One row per transaction: marks that exact transaction (not the whole
// merchant) as recurring, with a user-editable frequency/next-date. Amount,
// category, and income/expense direction are read live off the linked
// transaction rather than snapshotted here, since this row represents
// exactly one transaction rather than an abstract merchant pattern.
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

export const transactionRecurringRelations = relations(transactionRecurring, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionRecurring.transactionId],
    references: [transactions.id],
  }),
  user: one(users, {
    fields: [transactionRecurring.userId],
    references: [users.id],
  }),
}));
```

Then add `transactionRecurring: many(transactionRecurring),` as a new line inside `usersRelations` (next to the existing `recurringSeries: many(recurringSeries),` line).

- [ ] **Step 2: Write the migration**

Create `drizzle/0027_transaction_recurring.sql`:

```sql
CREATE TABLE IF NOT EXISTS "transaction_recurring" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "transaction_id" varchar(36) NOT NULL REFERENCES "transactions"("id") ON DELETE cascade,
  "user_id" varchar(36) NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "frequency" varchar(20) NOT NULL,
  "interval_days" integer,
  "next_date" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_transaction_recurring_transaction_id" ON "transaction_recurring" ("transaction_id");
CREATE INDEX IF NOT EXISTS "idx_transaction_recurring_user_id" ON "transaction_recurring" ("user_id");
```

- [ ] **Step 3: Apply to sandbox and verify**

```bash
psql postgresql://localhost/kabuki_sandbox -f drizzle/0027_transaction_recurring.sql
psql postgresql://localhost/kabuki_sandbox -c "\d transaction_recurring"
```
Expected: table description showing all 7 columns plus the two indexes.

- [ ] **Step 4: Update `DATABASE.md`**

Add a row to the migration log table:
```
| 2026-08-08 | `0027_transaction_recurring.sql` | `transaction_recurring` table — per-transaction recurring override, independent of `recurring_series` |
```
And append to the `transactions` row's "Notes" cell in the "Current schema state" table... actually `transaction_recurring` is a new table, not a new column — add a new row to that table instead:
```
| `transaction_recurring` | 0027 | Per-transaction recurring override (frequency/next-date), separate from `recurring_series` |
```

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```
Expected: no new errors (existing baseline errors, if any, unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts drizzle/0027_transaction_recurring.sql DATABASE.md
git commit -m "feat: add transaction_recurring table for per-transaction recurring overrides"
```

---

### Task 2: `'custom'` frequency support in shared types + `recurring.ts`

**Files:**
- Modify: `src/lib/recurring-shared.ts`
- Modify: `src/lib/recurring.ts`

**Interfaces:**
- Consumes: nothing new from Task 1.
- Produces: `Frequency` now includes `'custom'`. `RecurringEntry` gains `intervalDays: number | null` and `manualSource: 'series' | 'transaction' | null`. New export `perMonthFactor(frequency: Frequency, intervalDays?: number | null): number`, replacing direct `PER_MONTH[frequency]` indexing wherever `frequency` might be `'custom'`. `getRecurringEntries`'s existing two entry-construction loops set `intervalDays: null` and `manualSource: null` / `manualSource: 'series'` respectively — consumed by Task 4's new third loop and by `recurring-view.tsx`.

- [ ] **Step 1: Update `src/lib/recurring-shared.ts`**

Change the `Frequency` type and `FREQUENCY_LABELS`:

```ts
export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  yearly: 'Annual',
  custom: 'Custom',
};
```

Change `PER_MONTH` to exclude `'custom'` (it can't have a fixed constant — the cadence varies per entry via `intervalDays`) and add `perMonthFactor` right after it:

```ts
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
```

Update `RecurringEntry`:

```ts
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
```

Update `occurrencesInMonth`'s weekly/biweekly branch to also step custom intervals:

```ts
    // Weekly / biweekly / custom: step by a fixed interval from the anchor in
    // both directions until we cover the visible month.
    const stepDays =
      entry.frequency === 'weekly' ? 7 : entry.frequency === 'biweekly' ? 14 : entry.intervalDays || 30;
```
(This replaces the existing line `const stepDays = entry.frequency === 'weekly' ? 7 : 14;`.)

- [ ] **Step 2: Update `src/lib/recurring.ts`'s imports and `PER_MONTH` usage**

Change the import line:
```ts
import { isoDay, perMonthFactor, type Frequency, type RecurringEntry } from './recurring-shared';
```

Replace both occurrences of `monthlyCost: amount * PER_MONTH[frequency],` with `monthlyCost: amount * perMonthFactor(frequency),`.

- [ ] **Step 3: Add the two new fields to `getRecurringEntries`'s existing entries**

In the first loop (detected + override merge), add two lines to the pushed object (after `nextDate:` line is fine, order doesn't matter as long as both are present):
```ts
      intervalDays: null,
      manualSource: null,
```

In the second loop (pure `recurring_series` manual entries), add:
```ts
      intervalDays: null,
      manualSource: 'series' as const,
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```
Expected: no errors. If `recurring-view.tsx` now shows errors about missing `intervalDays`/`manualSource` on object literals typed as `RecurringEntry`, that's expected and fixed in Task 4 — note them but don't fix here.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recurring-shared.ts src/lib/recurring.ts
git commit -m "feat: add custom recurrence interval support to Frequency and RecurringEntry"
```

---

### Task 3: Rewrite `GET`/`POST /api/transactions/[id]/recurring`

**Files:**
- Modify: `src/app/api/transactions/[id]/recurring/route.ts` (full rewrite)

**Interfaces:**
- Consumes: `transactionRecurring` table (Task 1), `perMonthFactor`/`Frequency` (Task 2, not directly needed here but `Frequency` type is), `estimateRecurrence`/`getTransactionsForMerchant`/`getRecurringItems`/`normalizeMerchant` from `src/lib/spending-insights.ts` (unchanged, already implemented), `isoDay`/`parseDateInput` from `src/lib/recurring-shared.ts`.
- Produces: `RecurringStatus` response shape `{ isRecurring, frequency, intervalDays, nextDate, source }` — consumed by Task 5's modal.

- [ ] **Step 1: Replace the full file contents**

```ts
import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { transactions, transactionRecurring } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import {
  getRecurringItems,
  getTransactionsForMerchant,
  estimateRecurrence,
  normalizeMerchant,
} from '@/lib/spending-insights';
import { isoDay, parseDateInput, type Frequency } from '@/lib/recurring-shared';

const VALID_FREQUENCIES: Frequency[] = ['weekly', 'biweekly', 'monthly', 'yearly', 'custom'];

interface RecurringStatus {
  isRecurring: boolean;
  frequency: Frequency | null;
  intervalDays: number | null;
  nextDate: string | null;
  source: 'override' | 'detected' | null;
}

async function loadTransaction(id: string, householdUserIds: string[]) {
  const tx = await db.query.transactions.findFirst({
    where: eq(transactions.id, id),
    with: { account: { with: { plaidItem: true } } },
  });
  if (!tx || !householdUserIds.includes(tx.account.plaidItem.userId)) return null;
  return tx;
}

function resolveStatus(
  override: typeof transactionRecurring.$inferSelect | undefined,
  detected: { frequency: Frequency; nextDate: string } | null
): RecurringStatus {
  if (override) {
    return {
      isRecurring: true,
      frequency: override.frequency as Frequency,
      intervalDays: override.intervalDays,
      nextDate: isoDay(override.nextDate),
      source: 'override',
    };
  }
  if (detected) {
    return {
      isRecurring: true,
      frequency: detected.frequency,
      intervalDays: null,
      nextDate: detected.nextDate,
      source: 'detected',
    };
  }
  return { isRecurring: false, frequency: null, intervalDays: null, nextDate: null, source: null };
}

async function findDetected(userId: string, merchantKey: string) {
  const detected = await getRecurringItems(userId);
  return detected.find((item) => item.merchantKey === merchantKey) || null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const tx = await loadTransaction(id, user.householdUserIds);
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    const merchantKey = normalizeMerchant(tx.merchant || tx.name);
    const [override, detectedItem] = await Promise.all([
      db.query.transactionRecurring.findFirst({ where: eq(transactionRecurring.transactionId, tx.id) }),
      findDetected(user.id, merchantKey),
    ]);

    return Response.json(resolveStatus(override, detectedItem));
  } catch (error) {
    console.error('Error fetching transaction recurring status:', error);
    return Response.json({ error: 'Failed to fetch recurring status' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const { id } = await params;
    const tx = await loadTransaction(id, user.householdUserIds);
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    const body = await request.json();
    const { action } = body;
    if (action !== 'confirm' && action !== 'dismiss' && action !== 'update') {
      return Response.json({ error: 'action must be "confirm", "dismiss", or "update"' }, { status: 400 });
    }

    const merchantKey = normalizeMerchant(tx.merchant || tx.name);
    const existing = await db.query.transactionRecurring.findFirst({
      where: eq(transactionRecurring.transactionId, tx.id),
    });

    if (action === 'dismiss') {
      if (existing) {
        await db.delete(transactionRecurring).where(eq(transactionRecurring.id, existing.id));
      }
      const detectedItem = await findDetected(user.id, merchantKey);
      return Response.json(resolveStatus(undefined, detectedItem));
    }

    let frequency: Frequency;
    let intervalDays: number | null = null;
    let nextDate: Date;

    if (action === 'update') {
      if (!VALID_FREQUENCIES.includes(body.frequency)) {
        return Response.json({ error: 'Invalid frequency' }, { status: 400 });
      }
      frequency = body.frequency;
      if (frequency === 'custom') {
        if (!Number.isInteger(body.intervalDays) || body.intervalDays < 1) {
          return Response.json({ error: 'intervalDays must be a positive integer' }, { status: 400 });
        }
        intervalDays = body.intervalDays;
      }
      if (typeof body.nextDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.nextDate)) {
        return Response.json({ error: 'nextDate is required (yyyy-mm-dd)' }, { status: 400 });
      }
      nextDate = parseDateInput(body.nextDate);
    } else {
      // action === 'confirm': no explicit values — an existing override
      // always wins as-is; otherwise seed from detection, falling back to
      // an estimate against this merchant's history.
      if (existing) {
        return Response.json(resolveStatus(existing, null));
      }
      const detectedItem = await findDetected(user.id, merchantKey);
      if (detectedItem) {
        frequency = detectedItem.frequency;
        nextDate = parseDateInput(detectedItem.nextDate);
      } else {
        const matchingTxs = await getTransactionsForMerchant(user.id, merchantKey);
        const estimate = estimateRecurrence(matchingTxs);
        frequency = estimate.frequency;
        nextDate = estimate.nextDate;
      }
    }

    if (existing) {
      await db
        .update(transactionRecurring)
        .set({ frequency, intervalDays, nextDate, updatedAt: new Date() })
        .where(eq(transactionRecurring.id, existing.id));
    } else {
      await db.insert(transactionRecurring).values({
        id: generateId(),
        transactionId: tx.id,
        userId: user.id,
        frequency,
        intervalDays,
        nextDate,
      });
    }

    return Response.json({
      isRecurring: true,
      frequency,
      intervalDays,
      nextDate: isoDay(nextDate),
      source: 'override',
    } satisfies RecurringStatus);
  } catch (error) {
    console.error('Error updating transaction recurring status:', error);
    return Response.json({ error: 'Failed to update recurring status' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit
npx eslint src/app/api/transactions/\[id\]/recurring/route.ts
```
Expected: no errors.

- [ ] **Step 3: Manual DB-level verification against sandbox**

Pick a transaction id and merchant that sandbox data supports both an "auto-detected" case and a "never detected" case (reuse whatever merchant the original implementation's Task 3 verification found — check prior session's ad-hoc scripts if still around, otherwise query fresh):

```bash
npx tsx -e "
import { db } from './src/db';
import { transactions } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const tx = await db.query.transactions.findFirst({ where: eq(transactions.merchant, 'Employer Payroll') });
  console.log(tx?.id, tx?.merchant, tx?.amount);
}
main().then(() => process.exit(0));
"
```

Then, with a real transaction id in hand, exercise the route logic directly (mirroring GET/POST) via a similar ad-hoc script: confirm → verify a `transaction_recurring` row was inserted with the expected frequency/nextDate; update with `frequency: 'custom', intervalDays: 45, nextDate: '2026-09-01'` → verify the row updated; dismiss → verify the row was deleted and, if the merchant is auto-detected, that `resolveStatus` still returns `isRecurring: true, source: 'detected'` afterward. Clean up (delete) any row you created that wasn't there originally.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/transactions/[id]/recurring/route.ts"
git commit -m "feat: rewrite transaction recurring endpoint to be per-transaction"
```

---

### Task 4: Surface transaction-scoped entries on `/spending/recurring`

**Files:**
- Modify: `src/lib/recurring.ts`
- Modify: `src/components/spending/recurring-view.tsx`

**Interfaces:**
- Consumes: `transactionRecurring` (Task 1), `perMonthFactor`/`manualSource`/`intervalDays` (Task 2).
- Produces: `getRecurringEntries` now returns entries with `manualSource: 'transaction'` for every household `transaction_recurring` row, `id` set to the **transaction id** (not the row's own id) so the UI can route delete calls to `/api/transactions/[id]/recurring`.

This task exists because the Recurring page's list, so far, has always had exactly one entry per `merchantKey`. Adding transaction-scoped entries breaks that assumption — two entries can now legitimately share a `merchantKey` (e.g. a detected merchant-wide entry plus one transaction's own override). The page currently uses `merchantKey` as the React list key, as the "which row's menu is open" identifier, and as the optimistic-remove filter key — all three need to switch to a value that's actually unique per entry.

- [ ] **Step 1: Add the third entry source to `getRecurringEntries`**

In `src/lib/recurring.ts`, add `transactionRecurring` to the schema import:
```ts
import { recurringSeries, transactionRecurring } from '@/db/schema';
```

Add a third parallel query and a third loop. Replace:
```ts
  const householdIds = await getHouseholdUserIds(userId);
  const [detected, overrides, allCategories] = await Promise.all([
    getRecurringItems(userId, ownerFilter),
    db.query.recurringSeries.findMany({ where: inArray(recurringSeries.userId, householdIds) }),
    db.query.categories.findMany(),
  ]);
```
with:
```ts
  const householdIds = await getHouseholdUserIds(userId);
  const [detected, overrides, txOverrides, allCategories] = await Promise.all([
    getRecurringItems(userId, ownerFilter),
    db.query.recurringSeries.findMany({ where: inArray(recurringSeries.userId, householdIds) }),
    db.query.transactionRecurring.findMany({
      where: inArray(transactionRecurring.userId, householdIds),
      with: { transaction: true },
    }),
    db.query.categories.findMany(),
  ]);
```

Then, right before the final `return entries.sort(...)`, add the third loop:
```ts
  // Per-transaction overrides — each becomes its own entry, independent of
  // (and in addition to) any merchant-level entry for the same merchant.
  for (const row of txOverrides) {
    const tx = row.transaction;
    if (!tx) continue;
    const frequency = row.frequency as Frequency;
    const amount = Math.abs(Number(tx.amount));
    const category = tx.categoryId ? categoryMap.get(tx.categoryId) : null;

    entries.push({
      id: row.transactionId,
      merchantKey: normalizeMerchant(tx.merchant || tx.name),
      merchant: tx.merchant || tx.name,
      categoryId: category?.id ?? null,
      categoryName: category?.name ?? null,
      categoryIcon: category?.icon ?? null,
      categoryColor: category?.color ?? null,
      logoUrl: null,
      frequency,
      intervalDays: row.intervalDays,
      amount,
      monthlyCost: amount * perMonthFactor(frequency, row.intervalDays),
      nextDate: isoDay(row.nextDate),
      isIncome: Number(tx.amount) > 0,
      isManual: true,
      manualSource: 'transaction',
      needsReview: false,
      previousAmount: null,
      priceIncreased: false,
      occurrences: 0,
    });
  }
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```
Expected: no errors from `recurring.ts`. `recurring-view.tsx` will still error until Step 3 — that's expected.

- [ ] **Step 3: Fix `recurring-view.tsx`'s per-merchant assumptions**

Add a small helper near the top of the file (after imports, before the main component):
```ts
// Entries now may share a merchantKey (a detected merchant-wide entry and a
// transaction-scoped override can coexist) — id is unique whenever present;
// merchantKey alone is only safe as a fallback for detected-but-unreviewed
// entries, which are always singular per merchant.
function entryKey(entry: RecurringEntry): string {
  return entry.id ?? entry.merchantKey;
}
```

Replace the optimistic-remove filter (in `remove`):
```ts
    setEntries((prev) => prev.filter((e) => e.merchantKey !== entry.merchantKey));
```
with:
```ts
    setEntries((prev) => prev.filter((e) => entryKey(e) !== entryKey(entry)));
```

Replace the `remove` function's routing so transaction-scoped entries dismiss through the right endpoint instead of silently no-oping against `/api/recurring/[id]`. The existing body:
```ts
    if (entry.id) {
      await fetch(`/api/recurring/${entry.id}`, { method: 'DELETE' });
    } else {
      // Detected but never reviewed — dismissing is the same as answering "No".
      await fetch('/api/recurring/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantKey: entry.merchantKey,
          merchantName: entry.merchant,
          status: 'dismissed',
        }),
      });
    }
```
becomes:
```ts
    if (entry.manualSource === 'transaction') {
      await fetch(`/api/transactions/${entry.id}/recurring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      });
    } else if (entry.id) {
      await fetch(`/api/recurring/${entry.id}`, { method: 'DELETE' });
    } else {
      // Detected but never reviewed — dismissing is the same as answering "No".
      await fetch('/api/recurring/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantKey: entry.merchantKey,
          merchantName: entry.merchant,
          status: 'dismissed',
        }),
      });
    }
```

Replace the list's `key` prop:
```tsx
                <div key={entry.merchantKey} className="flex items-center gap-3 px-6 py-3.5">
```
with:
```tsx
                <div key={entryKey(entry)} className="flex items-center gap-3 px-6 py-3.5">
```

Replace the row-menu open/close identity (both occurrences):
```tsx
                    open={menuOpenId === entry.merchantKey}
                    onToggle={() =>
                      setMenuOpenId(menuOpenId === entry.merchantKey ? null : entry.merchantKey)
                    }
```
with:
```tsx
                    open={menuOpenId === entryKey(entry)}
                    onToggle={() =>
                      setMenuOpenId(menuOpenId === entryKey(entry) ? null : entryKey(entry))
                    }
```

In `RowMenu`, gate the Edit button on `manualSource` instead of `isManual` (transaction-scoped entries are edited from the transaction modal, not this page — this page's Edit form posts merchant/amount/category fields that don't apply to a transaction-scoped row):
```tsx
            {entry.isManual && (
              <button
                onClick={onEdit}
```
becomes:
```tsx
            {entry.manualSource === 'series' && (
              <button
                onClick={onEdit}
```
(The "Manual" badge elsewhere, gated on `entry.isManual`, stays as-is — both series-manual and transaction-scoped entries are correctly labeled "Manual".)

- [ ] **Step 4: Typecheck and lint**

```bash
npx tsc --noEmit
npx eslint src/lib/recurring.ts src/components/spending/recurring-view.tsx
```
Expected: no errors.

- [ ] **Step 5: Manual verification against sandbox**

Using the transaction id from Task 3's verification (after re-confirming it, since Task 3's cleanup deleted the row), run:
```bash
npx tsx -e "
import { getRecurringEntries } from './src/lib/recurring';

async function main() {
  const entries = await getRecurringEntries('<user-id>');
  const mine = entries.filter((e) => e.manualSource === 'transaction');
  console.log(mine);
}
main().then(() => process.exit(0));
"
```
Expected: one entry with `manualSource: 'transaction'`, correct merchant/amount/frequency, and (if the merchant is also auto-detected) a second, separate entry for the detected pattern with a different `id`. Clean up afterward (dismiss via the route, as in Task 3).

- [ ] **Step 6: Commit**

```bash
git add src/lib/recurring.ts src/components/spending/recurring-view.tsx
git commit -m "feat: surface transaction-scoped recurring overrides on the Recurring page"
```

---

### Task 5: Modal UI — Edit Frequency section

**Files:**
- Modify: `src/components/transaction-edit-modal.tsx`

**Interfaces:**
- Consumes: `RecurringStatus` shape from Task 3's route (`{ isRecurring, frequency, intervalDays, nextDate, source }`).

- [ ] **Step 1: Update the `recurring` state type**

Replace:
```ts
  const [recurring, setRecurring] = useState<{
    isRecurring: boolean;
    frequency: Frequency | null;
    nextDate: string | null;
  } | null>(null);
```
with:
```ts
  const [recurring, setRecurring] = useState<{
    isRecurring: boolean;
    frequency: Frequency | null;
    intervalDays: number | null;
    nextDate: string | null;
    source: 'override' | 'detected' | null;
  } | null>(null);
```

- [ ] **Step 2: Add Edit Frequency form state, synced from `recurring`**

Add after the existing `recurringError` state declaration:
```ts
  const [editFrequency, setEditFrequency] = useState<Frequency>('monthly');
  const [editIntervalDays, setEditIntervalDays] = useState('30');
  const [editNextDate, setEditNextDate] = useState('');
```

Add a new effect after the existing recurring-fetch effect, to keep the form fields pre-filled from server state whenever it changes (toggled on, dismissed, or updated elsewhere):
```ts
  useEffect(() => {
    if (recurring?.isRecurring) {
      setEditFrequency(recurring.frequency || 'monthly');
      setEditIntervalDays(recurring.intervalDays ? String(recurring.intervalDays) : '30');
      setEditNextDate(recurring.nextDate || '');
    }
  }, [recurring?.isRecurring, recurring?.frequency, recurring?.intervalDays, recurring?.nextDate]);
```

- [ ] **Step 3: Add the `saveFrequency` handler**

Add after `toggleRecurring`:
```ts
  const saveFrequency = async (next: { frequency: Frequency; intervalDays?: number; nextDate: string }) => {
    if (savingRecurring) return;
    const previous = recurring;
    setSavingRecurring(true);
    setRecurringError('');
    try {
      const res = await fetch(`/api/transactions/${transaction.id}/recurring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', ...next }),
      });
      if (res.ok) {
        setRecurring(await res.json());
      } else {
        const data = await res.json();
        setRecurringError(data.error || 'Failed to update recurring status');
        setRecurring(previous);
      }
    } catch {
      setRecurringError('Failed to update recurring status');
      setRecurring(previous);
    } finally {
      setSavingRecurring(false);
    }
  };
```

- [ ] **Step 4: Replace the Recurring row's JSX**

Replace the entire existing Recurring `<div className={rowClass}>...</div>` block with:
```tsx
          {/* Recurring */}
          <div className={rowClass}>
            <div className="flex-1 pr-3">
              <p className="text-sm text-foreground inline-flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-muted-foreground" />
                Recurring
              </p>
              {recurring?.isRecurring && recurring.frequency && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {recurring.source === 'detected' ? 'Auto-detected · ' : ''}
                  {recurring.frequency === 'custom'
                    ? `Every ${recurring.intervalDays} days`
                    : FREQUENCY_LABELS[recurring.frequency]}
                  {recurring.nextDate
                    ? ` · next ${new Date(`${recurring.nextDate}T00:00:00`).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}`
                    : ''}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">Applies only to this transaction.</p>
              {recurringError && <p className="text-xs text-red-500 mt-1">{recurringError}</p>}
              {recurring?.isRecurring && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    value={editFrequency}
                    onChange={(e) => {
                      const freq = e.target.value as Frequency;
                      setEditFrequency(freq);
                      if (freq !== 'custom') {
                        saveFrequency({ frequency: freq, nextDate: editNextDate || recurring.nextDate || '' });
                      }
                    }}
                    className="px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Annual</option>
                    <option value="custom">Other</option>
                  </select>
                  {editFrequency === 'custom' && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      every
                      <input
                        type="number"
                        min="1"
                        value={editIntervalDays}
                        onChange={(e) => setEditIntervalDays(e.target.value)}
                        onBlur={() => {
                          const days = parseInt(editIntervalDays, 10);
                          if (Number.isInteger(days) && days > 0) {
                            saveFrequency({
                              frequency: 'custom',
                              intervalDays: days,
                              nextDate: editNextDate || recurring.nextDate || '',
                            });
                          }
                        }}
                        className="w-14 px-1.5 py-1 rounded-lg border border-border bg-background text-foreground text-xs"
                      />
                      days
                    </span>
                  )}
                  <input
                    type="date"
                    value={editNextDate}
                    onChange={(e) => setEditNextDate(e.target.value)}
                    onBlur={() => {
                      if (!editNextDate) return;
                      saveFrequency(
                        editFrequency === 'custom'
                          ? {
                              frequency: 'custom',
                              intervalDays: parseInt(editIntervalDays, 10) || 30,
                              nextDate: editNextDate,
                            }
                          : { frequency: editFrequency, nextDate: editNextDate }
                      );
                    }}
                    className="px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
                  />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={toggleRecurring}
              disabled={recurringLoading || savingRecurring}
              role="switch"
              aria-checked={!!recurring?.isRecurring}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${
                recurring?.isRecurring ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  recurring?.isRecurring ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
```

- [ ] **Step 5: Typecheck and lint**

```bash
npx tsc --noEmit
npx eslint src/components/transaction-edit-modal.tsx
```
Expected: no new errors (compare against baseline pre-existing lint issues in this file, same approach as the original implementation — `git stash`/`git stash pop` if needed to diff).

- [ ] **Step 6: Build**

```bash
npm run build
```
Expected: succeeds, both routes register.

- [ ] **Step 7: Commit**

```bash
git add src/components/transaction-edit-modal.tsx
git commit -m "feat: add per-transaction Edit Frequency control to the recurring toggle"
```

---

## Self-Review Notes

- **Spec coverage:** Data model (Task 1), toggle semantics/2-tier resolution (Task 3), turn-off-snaps-back-if-detected behavior (Task 3's dismiss branch + `resolveStatus`), custom interval (Tasks 2/3/5), Recurring page integration (Task 4), modal Edit Frequency (Task 5) — all covered.
- **Correction made during planning, not in the original spec:** the spec said "No changes to `RecurringView` beyond whatever `RecurringEntry.intervalDays` rendering needs." That undersold the actual risk — the Recurring page's list key, menu-open state, and remove()'s optimistic filter all assumed one entry per `merchantKey`, which stops being true once transaction-scoped entries can share a merchant with a detected/series entry. Left unfixed, "Remove" on a transaction-scoped entry would silently no-op (wrong DELETE target) and removing one entry could visually drop an unrelated same-merchant entry too. Task 4 fixes this — it's a bug-avoidance correction consistent with the spec's intent ("deletable" from the Recurring page), not a scope change.
- **Type consistency check:** `RecurringStatus` (route) → `recurring` state (modal) → `saveFrequency` payload — `frequency`/`intervalDays`/`nextDate` names match throughout. `RecurringEntry.manualSource` (recurring-shared) is set in `recurring.ts`'s three loops and consumed identically in `recurring-view.tsx`. `perMonthFactor` signature matches its two call sites (`recurring.ts` for existing entries pass no `intervalDays`, defaulting the `'custom'` branch to unreachable there since those entries are never `'custom'`; Task 4's new loop passes `row.intervalDays` explicitly).
