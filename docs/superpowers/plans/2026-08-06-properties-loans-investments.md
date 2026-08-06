# Properties, Loan Calculator & Investments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone "Properties" section (overview, manage, pay-ahead calculator, loan calculator) fully excluded from net worth; enhance Invest > Options with a search bar and strategy tooltips and wire Invest holdings to real seeded data; overhaul `src/db/seed.ts` so a fresh local seed produces a realistic, fully-populated household (cash, credit, auto loan, investments, 2 properties, 6 months of history) with no empty charts.

**Architecture:** Two new Drizzle tables (`properties`, `property_value_history`) plus a `holdings` table, deliberately **not** wired into `accounts`/`getUserAccounts`/net-worth aggregation — this is what makes net-worth exclusion automatic rather than something to remember at every call site. A new `src/lib/loan-amortization.ts` is the single source of amortization math, shared by the Properties pages, the pay-ahead calculator, and the standalone loan calculator. Properties pages follow the existing Home/Spending pattern: async server-component `page.tsx` fetches via query helpers, passes plain serialized data into a `'use client'` view component that owns interactivity/Recharts. Invest stays `'use client'`-first per its existing pattern, but Holdings (`/invest`) becomes server-fetched like Home/Spending; Options/Predictions get UI-only additions.

**Tech Stack:** Next.js App Router (server components + `'use client'` views), Drizzle ORM / Postgres, Recharts v3, `@base-ui/react` (button, and new tooltip/dialog usage), Tailwind v4 with existing OKLCH theme tokens, `lucide-react` icons, hand-rolled modals (no shared `<Dialog>` primitive exists yet).

## Global Constraints

- Local dev targets sandbox Postgres `kabuki_sandbox` only — never touch production Supabase from this plan. Migrations get hand-applied to sandbox per `DATABASE.md`; production application is a separate, explicit follow-up the user triggers later, not part of this plan.
- Follow `DATABASE.md` migration workflow exactly: edit `src/db/schema.ts` first, then hand-write `drizzle/00NN_*.sql` with `IF NOT EXISTS` guards, apply via `psql` to sandbox, log in `DATABASE.md`'s migration table and "Current schema state" table.
- Next migration number is `0019` (last is `0018_api_request_logs.sql`).
- Real estate property values and mortgage liabilities must be **completely excluded** from `getCurrentNetWorth`, `getNetWorthSeries`, and every other net-worth/asset aggregation (`src/lib/net-worth.ts`, `src/components/home/home-overview.tsx`, `src/components/home/net-worth-view.tsx`, `src/app/accounts/page.tsx`). Achieved structurally: properties/holdings never touch the `accounts` table, so no existing aggregation code should need to change. Do not add `assetType: 'property'` accounts anywhere in seed data — that would double up with the new `properties` table and re-enter net worth.
- Reuse `src/components/owner-badge.tsx` (`OWNERS`, `OwnerKey`) and `src/lib/owner-filter.ts` for any owner field — do not invent a parallel owner enum.
- Reuse `generateId()` from `src/lib/id.ts` for all new row IDs; reuse `getUser()` / `assertWriteAccess()` from `src/lib/auth.ts` for all new API routes.
- No test framework exists in this repo (`package.json` has no `test` script, no jest/vitest). Verification steps in this plan use `npm run build`, direct `psql` queries, and manual page checks instead of unit tests — do not invent a test framework as part of this work.
- Money columns: `numeric(16,2)`. Interest rate: `numeric(6,3)` storing a percentage (e.g. `6.200` = 6.2%), matching how the spec expresses rates.
- Styling: match existing conventions — `bg-card border border-border rounded-lg p-4/p-6`, `text-foreground`/`text-muted-foreground`, `text-emerald-600`/`text-red-600` for positive/negative deltas, Recharts colors via `var(--primary)`/`var(--chart-1..5)`/`var(--muted-foreground)` CSS custom properties so charts adapt to light/dark.

---

## File Structure

**New files:**
- `drizzle/0019_properties_and_holdings.sql` — migration
- `src/lib/loan-amortization.ts` — amortization math (pure functions, no DB)
- `src/lib/properties.ts` — Drizzle queries/mutations for properties + equity series
- `src/lib/holdings.ts` — Drizzle queries for investment holdings + allocation
- `src/app/api/properties/route.ts` — GET (list), POST (create)
- `src/app/api/properties/[id]/route.ts` — PATCH (update), DELETE
- `src/app/properties/page.tsx` — Overview (server component)
- `src/app/properties/manage/page.tsx` — Manage (server component)
- `src/app/properties/pay-ahead/page.tsx` — Pay-Ahead Calculator (server component wrapper)
- `src/app/properties/loan-calculator/page.tsx` — Loan Calculator (server component wrapper, page-only, no DB)
- `src/components/properties/properties-overview.tsx` — `'use client'` view for Overview
- `src/components/properties/manage-properties-view.tsx` — `'use client'` view for Manage (list + add/edit/delete modal)
- `src/components/properties/pay-ahead-calculator.tsx` — `'use client'` view for Pay-Ahead
- `src/components/properties/loan-calculator-view.tsx` — `'use client'` view for standalone Loan Calculator
- `src/components/properties/amortization-table.tsx` — shared amortization table component (used by both calculators)
- `src/components/ui/tooltip.tsx` — small shared hover-tooltip primitive (built on `@base-ui/react`'s tooltip), used by Options strategy cards

**Modified files:**
- `src/db/schema.ts` — add `properties`, `propertyValueHistory`, `holdings` tables + relations
- `src/db/seed.ts` — add Renato/Claudia manual accounts (cash, credit, auto loan), holdings, properties, 6 months of balance history + transactions
- `src/components/sidebar.tsx` — add "Properties" nav section
- `src/components/page-tabs.tsx` — add `PROPERTIES_TABS`
- `src/app/invest/page.tsx` — become server component fetching real `holdings`, pass to a new client view
- `src/app/invest/options/page.tsx` — add search bar + strategy tooltips
- `DATABASE.md` — log migration `0019`, update "Current schema state"

**New file (Invest holdings view, split out since `invest/page.tsx` becomes a server component):**
- `src/components/invest/holdings-view.tsx` — `'use client'` view carrying the existing portfolio chart / sparkline / allocation UI, now fed real data instead of local mock arrays

---

### Task 1: Schema — `properties`, `property_value_history`, `holdings` tables

**Files:**
- Modify: `src/db/schema.ts`

**Interfaces:**
- Produces: `properties` table (`id, name, address, owner, estimatedValue, originalLoanAmount, interestRate, loanTermYears, loanStartDate, notes, createdAt, updatedAt`), `propertyValueHistory` table (`id, propertyId, value, recordedAt`), `holdings` table (`id, accountId, symbol, name, assetClass, shares, costBasis, currentPrice, createdAt, updatedAt`), and their `relations()` exports (`propertiesRelations`, `propertyValueHistoryRelations`, `holdingsRelations`). All later tasks import these from `@/db/schema`.

- [ ] **Step 1: Add the three tables to `src/db/schema.ts`**

Insert after the `apiRequestLogs` table definition (before the `// Relations` section, so relations can reference `accounts`):

```ts
// Manually-tracked real estate. Deliberately NOT part of `accounts` — this
// is what keeps property value and mortgage balance out of net worth
// without needing exclusion logic at every net-worth call site.
export const properties = pgTable(
  "properties",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    address: varchar("address", { length: 500 }),
    owner: varchar("owner", { length: 20 }).default("joint").notNull(), // "renato" | "claudia" | "joint"
    estimatedValue: numeric("estimated_value", { precision: 16, scale: 2 }).notNull(),
    originalLoanAmount: numeric("original_loan_amount", { precision: 16, scale: 2 }).notNull(),
    interestRate: numeric("interest_rate", { precision: 6, scale: 3 }).notNull(), // annual %, e.g. 6.200
    loanTermYears: integer("loan_term_years").notNull(),
    loanStartDate: timestamp("loan_start_date").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_properties_owner").on(table.owner)]
);

// Manual value snapshots over time — drives the combined equity chart.
// One row per manual edit (or seed backfill); loan balance at any point is
// always computed from the loan terms, never stored.
export const propertyValueHistory = pgTable(
  "property_value_history",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    propertyId: varchar("property_id", { length: 36 })
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    value: numeric("value", { precision: 16, scale: 2 }).notNull(),
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_property_value_history_property_id").on(table.propertyId),
    index("idx_property_value_history_recorded_at").on(table.recordedAt),
  ]
);

// Investment holdings — line items inside a brokerage/retirement `accounts`
// row (type: "brokerage"). Current value is always shares * currentPrice,
// computed at query time rather than stored.
export const holdings = pgTable(
  "holdings",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    accountId: varchar("account_id", { length: 36 })
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 10 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    assetClass: varchar("asset_class", { length: 30 }).notNull(), // "us_stock" | "intl_stock" | "bond" | "cash"
    shares: numeric("shares", { precision: 16, scale: 4 }).notNull(),
    costBasis: numeric("cost_basis", { precision: 16, scale: 2 }).notNull(),
    currentPrice: numeric("current_price", { precision: 12, scale: 4 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_holdings_account_id").on(table.accountId)]
);
```

Then add relations near the other `relations()` calls at the bottom of the file:

```ts
export const propertiesRelations = relations(properties, ({ many }) => ({
  valueHistory: many(propertyValueHistory),
}));

export const propertyValueHistoryRelations = relations(propertyValueHistory, ({ one }) => ({
  property: one(properties, {
    fields: [propertyValueHistory.propertyId],
    references: [properties.id],
  }),
}));

export const holdingsRelations = relations(holdings, ({ one }) => ({
  account: one(accounts, {
    fields: [holdings.accountId],
    references: [accounts.id],
  }),
}));
```

Also extend `accountsRelations` to add `holdings: many(holdings)`:

```ts
export const accountsRelations = relations(accounts, ({ one, many }) => ({
  plaidItem: one(plaidItems, {
    fields: [accounts.plaidItemId],
    references: [plaidItems.id],
  }),
  transactions: many(transactions),
  balanceHistory: many(accountBalanceHistory),
  holdings: many(holdings),
}));
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit -p .` (or `npm run build` if that's faster to confirm — either must succeed with no schema-related errors).
Expected: no errors referencing `properties`, `propertyValueHistory`, or `holdings`.

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(db): add properties, property_value_history, holdings tables"
```

---

### Task 2: Migration `0019` + apply to sandbox + log in DATABASE.md

**Files:**
- Create: `drizzle/0019_properties_and_holdings.sql`
- Modify: `DATABASE.md`

**Interfaces:**
- Consumes: table/column names from Task 1.
- Produces: sandbox `kabuki_sandbox` has `properties`, `property_value_history`, `holdings` tables — every later task that touches the DB depends on this having been applied.

- [ ] **Step 1: Write the migration file**

```sql
-- Manually-tracked real estate (Properties feature). Not linked into
-- `accounts` — kept structurally out of net worth aggregation.
CREATE TABLE IF NOT EXISTS properties (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  owner VARCHAR(20) NOT NULL DEFAULT 'joint',
  estimated_value NUMERIC(16,2) NOT NULL,
  original_loan_amount NUMERIC(16,2) NOT NULL,
  interest_rate NUMERIC(6,3) NOT NULL,
  loan_term_years INTEGER NOT NULL,
  loan_start_date TIMESTAMP NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties (owner);

CREATE TABLE IF NOT EXISTS property_value_history (
  id VARCHAR(36) PRIMARY KEY,
  property_id VARCHAR(36) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  value NUMERIC(16,2) NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_value_history_property_id ON property_value_history (property_id);
CREATE INDEX IF NOT EXISTS idx_property_value_history_recorded_at ON property_value_history (recorded_at);

-- Investment holdings inside a brokerage/retirement account.
CREATE TABLE IF NOT EXISTS holdings (
  id VARCHAR(36) PRIMARY KEY,
  account_id VARCHAR(36) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  symbol VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  asset_class VARCHAR(30) NOT NULL,
  shares NUMERIC(16,4) NOT NULL,
  cost_basis NUMERIC(16,2) NOT NULL,
  current_price NUMERIC(12,4) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_holdings_account_id ON holdings (account_id);
```

- [ ] **Step 2: Apply to sandbox**

Run: `psql postgresql://localhost/kabuki_sandbox -f drizzle/0019_properties_and_holdings.sql`
Expected: `CREATE TABLE` / `CREATE INDEX` output, no errors. If the sandbox connection string differs, check `envs/.env.sandbox` or `.env.local` for `DATABASE_URL` first — do not guess a different host/port.

- [ ] **Step 3: Verify tables exist**

Run: `psql postgresql://localhost/kabuki_sandbox -c "\d properties" -c "\d property_value_history" -c "\d holdings"`
Expected: column lists matching Step 1 exactly.

- [ ] **Step 4: Log in DATABASE.md**

Add a row to the migration log table:
```
| 2026-08-06 | `0019_properties_and_holdings.sql` | `properties`, `property_value_history`, `holdings` tables — real estate tracking (excluded from net worth) and investment holdings |
```

Add rows to "Current schema state":
```
| `properties` | 0019 | Manually-tracked real estate; deliberately not linked to `accounts` — excluded from net worth |
| `property_value_history` | 0019 | Manual value snapshots; drives the combined equity chart |
| `holdings` | 0019 | Investment holdings inside a brokerage `accounts` row |
```

- [ ] **Step 5: Commit**

```bash
git add drizzle/0019_properties_and_holdings.sql DATABASE.md
git commit -m "feat(db): migration 0019 — properties, property_value_history, holdings"
```

---

### Task 3: Loan amortization library

**Files:**
- Create: `src/lib/loan-amortization.ts`

**Interfaces:**
- Produces (consumed by Tasks 5, 8, 9, 10, 11):
  - `calculateMonthlyPayment(principal: number, annualRatePct: number, termYears: number): number`
  - `calculateRemainingBalance(principal: number, annualRatePct: number, termYears: number, paymentsMade: number): number`
  - `monthsElapsedSince(startDate: Date, asOf?: Date): number`
  - `buildAmortizationSchedule(principal: number, annualRatePct: number, termYears: number): AmortizationRow[]` where `AmortizationRow = { month: number; payment: number; principalPaid: number; interestPaid: number; balance: number }`
  - `calculatePayoffWithExtra(principal: number, annualRatePct: number, termYears: number, extraMonthly: number): PayoffComparison` where `PayoffComparison = { originalMonths: number; originalTotalInterest: number; newMonths: number; newTotalInterest: number; monthsSaved: number; interestSaved: number; newPayoffDate: (startDate: Date) => Date }`

- [ ] **Step 1: Write the module**

```ts
// Standard fixed-rate amortization math — no DB access, pure functions so
// both the Properties pages and the standalone calculators share one
// implementation instead of drifting.

export function calculateMonthlyPayment(
  principal: number,
  annualRatePct: number,
  termYears: number
): number {
  const monthlyRate = annualRatePct / 100 / 12;
  const numPayments = termYears * 12;
  if (monthlyRate === 0) return principal / numPayments;
  const factor = Math.pow(1 + monthlyRate, numPayments);
  return (principal * monthlyRate * factor) / (factor - 1);
}

export function calculateRemainingBalance(
  principal: number,
  annualRatePct: number,
  termYears: number,
  paymentsMade: number
): number {
  const monthlyRate = annualRatePct / 100 / 12;
  const numPayments = termYears * 12;
  const clampedPayments = Math.min(Math.max(paymentsMade, 0), numPayments);
  if (monthlyRate === 0) {
    return Math.max(principal - (principal / numPayments) * clampedPayments, 0);
  }
  const payment = calculateMonthlyPayment(principal, annualRatePct, termYears);
  const factor = Math.pow(1 + monthlyRate, clampedPayments);
  const balance = principal * factor - payment * ((factor - 1) / monthlyRate);
  return Math.max(balance, 0);
}

export function monthsElapsedSince(startDate: Date, asOf: Date = new Date()): number {
  const months =
    (asOf.getFullYear() - startDate.getFullYear()) * 12 +
    (asOf.getMonth() - startDate.getMonth());
  return Math.max(months, 0);
}

export interface AmortizationRow {
  month: number;
  payment: number;
  principalPaid: number;
  interestPaid: number;
  balance: number;
}

export function buildAmortizationSchedule(
  principal: number,
  annualRatePct: number,
  termYears: number
): AmortizationRow[] {
  const monthlyRate = annualRatePct / 100 / 12;
  const numPayments = termYears * 12;
  const payment = calculateMonthlyPayment(principal, annualRatePct, termYears);
  const rows: AmortizationRow[] = [];
  let balance = principal;

  for (let month = 1; month <= numPayments; month++) {
    const interestPaid = balance * monthlyRate;
    const principalPaid = Math.min(payment - interestPaid, balance);
    balance = Math.max(balance - principalPaid, 0);
    rows.push({ month, payment, principalPaid, interestPaid, balance });
  }

  return rows;
}

export interface PayoffComparison {
  originalMonths: number;
  originalTotalInterest: number;
  newMonths: number;
  newTotalInterest: number;
  monthsSaved: number;
  interestSaved: number;
}

export function calculatePayoffWithExtra(
  principal: number,
  annualRatePct: number,
  termYears: number,
  extraMonthly: number
): PayoffComparison {
  const monthlyRate = annualRatePct / 100 / 12;
  const basePayment = calculateMonthlyPayment(principal, annualRatePct, termYears);
  const originalMonths = termYears * 12;
  const originalTotalInterest = basePayment * originalMonths - principal;

  if (extraMonthly <= 0) {
    return {
      originalMonths,
      originalTotalInterest,
      newMonths: originalMonths,
      newTotalInterest: originalTotalInterest,
      monthsSaved: 0,
      interestSaved: 0,
    };
  }

  const totalPayment = basePayment + extraMonthly;
  let balance = principal;
  let newMonths = 0;
  let newTotalInterest = 0;

  while (balance > 0.01 && newMonths < originalMonths) {
    const interestPaid = balance * monthlyRate;
    const principalPaid = Math.min(totalPayment - interestPaid, balance);
    balance = Math.max(balance - principalPaid, 0);
    newTotalInterest += interestPaid;
    newMonths++;
  }

  return {
    originalMonths,
    originalTotalInterest,
    newMonths,
    newTotalInterest,
    monthsSaved: originalMonths - newMonths,
    interestSaved: originalTotalInterest - newTotalInterest,
  };
}
```

- [ ] **Step 2: Sanity-check the math from a scratch script**

Run:
```bash
npx tsx -e "
import { calculateMonthlyPayment, calculateRemainingBalance, calculatePayoffWithExtra } from './src/lib/loan-amortization';
console.log('payment', calculateMonthlyPayment(310000, 6.2, 30));
console.log('balance after 24mo', calculateRemainingBalance(310000, 6.2, 30, 24));
console.log('payoff w/ +250', calculatePayoffWithExtra(310000, 6.2, 30, 250));
"
```
Expected: monthly payment ≈ `1897.90`; remaining balance after 24 months slightly below 310000 (mostly interest early on, so it drops slowly — expect roughly 303000-305000); payoff comparison shows `monthsSaved > 0` and `interestSaved > 0`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/loan-amortization.ts
git commit -m "feat: add loan amortization math library"
```

---

### Task 4: Properties query layer

**Files:**
- Create: `src/lib/properties.ts`

**Interfaces:**
- Consumes: `db` from `@/db`, `properties`/`propertyValueHistory` from `@/db/schema`, `generateId` from `@/lib/id`, amortization functions from Task 3.
- Produces (consumed by Tasks 6, 8, 9):
  - `interface PropertyInput { name: string; address?: string | null; owner: string; estimatedValue: number; originalLoanAmount: number; interestRate: number; loanTermYears: number; loanStartDate: string; notes?: string | null }`
  - `interface PropertyWithComputed { id, name, address, owner, estimatedValue, originalLoanAmount, interestRate, loanTermYears, loanStartDate: string, notes, monthlyPayment: number, remainingBalance: number, equity: number, payoffDate: string }`
  - `async function getAllProperties(): Promise<PropertyWithComputed[]>`
  - `async function getPropertyById(id: string): Promise<PropertyWithComputed | null>`
  - `async function createProperty(input: PropertyInput): Promise<string>` (returns new id; also inserts an initial `propertyValueHistory` row)
  - `async function updateProperty(id: string, input: Partial<PropertyInput>): Promise<void>` (inserts a new `propertyValueHistory` row iff `estimatedValue` changed)
  - `async function deleteProperty(id: string): Promise<void>`
  - `interface EquitySeriesPoint { month: string; year: number; label: string; totalValue: number; totalLoanBalance: number; totalEquity: number }`
  - `async function getCombinedEquitySeries(monthsBack?: number): Promise<EquitySeriesPoint[]>` — for each of the last `monthsBack` (default 6) months, sums each property's nearest-prior `propertyValueHistory.value` (falling back to `estimatedValue` if no history yet) minus `calculateRemainingBalance(...)` computed as of that month.

- [ ] **Step 1: Write `src/lib/properties.ts`**

```ts
import { db } from '@/db';
import { properties, propertyValueHistory } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { calculateMonthlyPayment, calculateRemainingBalance, monthsElapsedSince } from '@/lib/loan-amortization';

export interface PropertyInput {
  name: string;
  address?: string | null;
  owner: string;
  estimatedValue: number;
  originalLoanAmount: number;
  interestRate: number;
  loanTermYears: number;
  loanStartDate: string; // ISO date
  notes?: string | null;
}

export interface PropertyWithComputed {
  id: string;
  name: string;
  address: string | null;
  owner: string;
  estimatedValue: number;
  originalLoanAmount: number;
  interestRate: number;
  loanTermYears: number;
  loanStartDate: string;
  notes: string | null;
  monthlyPayment: number;
  remainingBalance: number;
  equity: number;
  payoffDate: string;
}

function withComputed(row: typeof properties.$inferSelect): PropertyWithComputed {
  const principal = Number(row.originalLoanAmount);
  const rate = Number(row.interestRate);
  const termYears = row.loanTermYears;
  const startDate = new Date(row.loanStartDate);
  const paymentsMade = monthsElapsedSince(startDate);
  const monthlyPayment = calculateMonthlyPayment(principal, rate, termYears);
  const remainingBalance = calculateRemainingBalance(principal, rate, termYears, paymentsMade);
  const estimatedValue = Number(row.estimatedValue);
  const payoffDate = new Date(startDate);
  payoffDate.setMonth(payoffDate.getMonth() + termYears * 12);

  return {
    id: row.id,
    name: row.name,
    address: row.address,
    owner: row.owner,
    estimatedValue,
    originalLoanAmount: principal,
    interestRate: rate,
    loanTermYears: termYears,
    loanStartDate: startDate.toISOString(),
    notes: row.notes,
    monthlyPayment,
    remainingBalance,
    equity: estimatedValue - remainingBalance,
    payoffDate: payoffDate.toISOString(),
  };
}

export async function getAllProperties(): Promise<PropertyWithComputed[]> {
  const rows = await db.query.properties.findMany({ orderBy: [asc(properties.createdAt)] });
  return rows.map(withComputed);
}

export async function getPropertyById(id: string): Promise<PropertyWithComputed | null> {
  const row = await db.query.properties.findFirst({ where: eq(properties.id, id) });
  return row ? withComputed(row) : null;
}

export async function createProperty(input: PropertyInput): Promise<string> {
  const id = generateId();
  const now = new Date();
  await db.insert(properties).values({
    id,
    name: input.name,
    address: input.address ?? null,
    owner: input.owner,
    estimatedValue: input.estimatedValue.toFixed(2),
    originalLoanAmount: input.originalLoanAmount.toFixed(2),
    interestRate: input.interestRate.toFixed(3),
    loanTermYears: input.loanTermYears,
    loanStartDate: new Date(input.loanStartDate),
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(propertyValueHistory).values({
    id: generateId(),
    propertyId: id,
    value: input.estimatedValue.toFixed(2),
    recordedAt: now,
  });
  return id;
}

export async function updateProperty(id: string, input: Partial<PropertyInput>): Promise<void> {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) updates.name = input.name;
  if (input.address !== undefined) updates.address = input.address;
  if (input.owner !== undefined) updates.owner = input.owner;
  if (input.estimatedValue !== undefined) updates.estimatedValue = input.estimatedValue.toFixed(2);
  if (input.originalLoanAmount !== undefined) updates.originalLoanAmount = input.originalLoanAmount.toFixed(2);
  if (input.interestRate !== undefined) updates.interestRate = input.interestRate.toFixed(3);
  if (input.loanTermYears !== undefined) updates.loanTermYears = input.loanTermYears;
  if (input.loanStartDate !== undefined) updates.loanStartDate = new Date(input.loanStartDate);
  if (input.notes !== undefined) updates.notes = input.notes;

  await db.update(properties).set(updates).where(eq(properties.id, id));

  if (input.estimatedValue !== undefined) {
    await db.insert(propertyValueHistory).values({
      id: generateId(),
      propertyId: id,
      value: input.estimatedValue.toFixed(2),
      recordedAt: new Date(),
    });
  }
}

export async function deleteProperty(id: string): Promise<void> {
  await db.delete(properties).where(eq(properties.id, id));
}

export interface EquitySeriesPoint {
  month: string;
  year: number;
  label: string;
  totalValue: number;
  totalLoanBalance: number;
  totalEquity: number;
}

export async function getCombinedEquitySeries(monthsBack: number = 6): Promise<EquitySeriesPoint[]> {
  const allProperties = await db.query.properties.findMany();
  if (allProperties.length === 0) return [];

  const historyByProperty = new Map<string, { value: number; recordedAt: Date }[]>();
  for (const property of allProperties) {
    const history = await db.query.propertyValueHistory.findMany({
      where: eq(propertyValueHistory.propertyId, property.id),
      orderBy: [asc(propertyValueHistory.recordedAt)],
    });
    historyByProperty.set(
      property.id,
      history.map((h) => ({ value: Number(h.value), recordedAt: h.recordedAt }))
    );
  }

  const now = new Date();
  const points: EquitySeriesPoint[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const asOf = new Date(now.getFullYear(), now.getMonth() - i, 1);
    let totalValue = 0;
    let totalLoanBalance = 0;

    for (const property of allProperties) {
      const history = historyByProperty.get(property.id) ?? [];
      const priorEntries = history.filter((h) => h.recordedAt <= asOf);
      const value = priorEntries.length > 0
        ? priorEntries[priorEntries.length - 1].value
        : Number(property.estimatedValue);

      const paymentsMade = monthsElapsedSince(new Date(property.loanStartDate), asOf);
      const balance = calculateRemainingBalance(
        Number(property.originalLoanAmount),
        Number(property.interestRate),
        property.loanTermYears,
        paymentsMade
      );

      totalValue += value;
      totalLoanBalance += balance;
    }

    points.push({
      month: String(asOf.getMonth() + 1).padStart(2, '0'),
      year: asOf.getFullYear(),
      label: asOf.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      totalValue,
      totalLoanBalance,
      totalEquity: totalValue - totalLoanBalance,
    });
  }

  return points;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit -p .`
Expected: no errors in `src/lib/properties.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/properties.ts
git commit -m "feat: add properties query/mutation layer with equity series"
```

---

### Task 5: Holdings query layer

**Files:**
- Create: `src/lib/holdings.ts`

**Interfaces:**
- Produces (consumed by Task 13):
  - `interface HoldingWithValue { id, accountId, symbol, name, assetClass, shares: number, costBasis: number, currentPrice: number, currentValue: number, gainLoss: number, gainLossPct: number }`
  - `async function getAllHoldings(): Promise<HoldingWithValue[]>` — joins every `holdings` row across all brokerage accounts.
  - `interface AllocationSlice { assetClass: string; value: number; pct: number }`
  - `async function getAllocation(): Promise<AllocationSlice[]>` — groups `getAllHoldings()` by `assetClass`.

- [ ] **Step 1: Write `src/lib/holdings.ts`**

```ts
import { db } from '@/db';
import { holdings } from '@/db/schema';

export interface HoldingWithValue {
  id: string;
  accountId: string;
  symbol: string;
  name: string;
  assetClass: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPct: number;
}

export async function getAllHoldings(): Promise<HoldingWithValue[]> {
  const rows = await db.query.holdings.findMany();
  return rows.map((row) => {
    const shares = Number(row.shares);
    const costBasis = Number(row.costBasis);
    const currentPrice = Number(row.currentPrice);
    const currentValue = shares * currentPrice;
    const gainLoss = currentValue - costBasis;
    return {
      id: row.id,
      accountId: row.accountId,
      symbol: row.symbol,
      name: row.name,
      assetClass: row.assetClass,
      shares,
      costBasis,
      currentPrice,
      currentValue,
      gainLoss,
      gainLossPct: costBasis > 0 ? (gainLoss / costBasis) * 100 : 0,
    };
  });
}

export interface AllocationSlice {
  assetClass: string;
  value: number;
  pct: number;
}

export async function getAllocation(): Promise<AllocationSlice[]> {
  const allHoldings = await getAllHoldings();
  const total = allHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  const byClass = new Map<string, number>();
  for (const h of allHoldings) {
    byClass.set(h.assetClass, (byClass.get(h.assetClass) ?? 0) + h.currentValue);
  }
  return Array.from(byClass.entries()).map(([assetClass, value]) => ({
    assetClass,
    value,
    pct: total > 0 ? (value / total) * 100 : 0,
  }));
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit -p .`

- [ ] **Step 3: Commit**

```bash
git add src/lib/holdings.ts
git commit -m "feat: add holdings query layer with allocation breakdown"
```

---

### Task 6: Properties API routes

**Files:**
- Create: `src/app/api/properties/route.ts`
- Create: `src/app/api/properties/[id]/route.ts`

**Interfaces:**
- Consumes: `getUser`, `assertWriteAccess` from `@/lib/auth`; `getAllProperties`, `createProperty`, `updateProperty`, `deleteProperty` from `@/lib/properties`.
- Produces: `GET /api/properties` → `PropertyWithComputed[]`; `POST /api/properties` (body: `PropertyInput`) → `{ id: string }`; `PATCH /api/properties/[id]` (body: `Partial<PropertyInput>`) → `{ success: true }`; `DELETE /api/properties/[id]` → `{ success: true }`. Consumed by Task 9's client-side add/edit/delete form.

- [ ] **Step 1: Write `src/app/api/properties/route.ts`**

```ts
import { getUser, assertWriteAccess } from '@/lib/auth';
import { getAllProperties, createProperty, type PropertyInput } from '@/lib/properties';

const VALID_OWNERS = ['renato', 'claudia', 'joint'];

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const properties = await getAllProperties();
    return Response.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    return Response.json({ error: 'Failed to fetch properties' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const demoBlock = assertWriteAccess(user);
  if (demoBlock) return demoBlock;

  try {
    const body = await request.json();
    const { name, address, owner, estimatedValue, originalLoanAmount, interestRate, loanTermYears, loanStartDate, notes } = body;

    if (typeof name !== 'string' || !name.trim()) {
      return Response.json({ error: 'name is required' }, { status: 400 });
    }
    if (!VALID_OWNERS.includes(owner)) {
      return Response.json({ error: 'invalid owner' }, { status: 400 });
    }
    if (
      typeof estimatedValue !== 'number' ||
      typeof originalLoanAmount !== 'number' ||
      typeof interestRate !== 'number' ||
      typeof loanTermYears !== 'number' ||
      typeof loanStartDate !== 'string'
    ) {
      return Response.json({ error: 'missing or invalid loan fields' }, { status: 400 });
    }

    const input: PropertyInput = {
      name: name.trim(),
      address: typeof address === 'string' ? address.trim() : null,
      owner,
      estimatedValue,
      originalLoanAmount,
      interestRate,
      loanTermYears,
      loanStartDate,
      notes: typeof notes === 'string' ? notes.trim() : null,
    };

    const id = await createProperty(input);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    console.error('Error creating property:', error);
    return Response.json({ error: 'Failed to create property' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write `src/app/api/properties/[id]/route.ts`**

```ts
import { getUser, assertWriteAccess } from '@/lib/auth';
import { updateProperty, deleteProperty, type PropertyInput } from '@/lib/properties';

const VALID_OWNERS = ['renato', 'claudia', 'joint'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const demoBlock = assertWriteAccess(user);
  if (demoBlock) return demoBlock;

  try {
    const { id } = await params;
    const body = await request.json();
    const updates: Partial<PropertyInput> = {};

    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
    if (body.address !== undefined) updates.address = typeof body.address === 'string' ? body.address.trim() : null;
    if (body.owner !== undefined) {
      if (!VALID_OWNERS.includes(body.owner)) {
        return Response.json({ error: 'invalid owner' }, { status: 400 });
      }
      updates.owner = body.owner;
    }
    if (typeof body.estimatedValue === 'number') updates.estimatedValue = body.estimatedValue;
    if (typeof body.originalLoanAmount === 'number') updates.originalLoanAmount = body.originalLoanAmount;
    if (typeof body.interestRate === 'number') updates.interestRate = body.interestRate;
    if (typeof body.loanTermYears === 'number') updates.loanTermYears = body.loanTermYears;
    if (typeof body.loanStartDate === 'string') updates.loanStartDate = body.loanStartDate;
    if (body.notes !== undefined) updates.notes = typeof body.notes === 'string' ? body.notes.trim() : null;

    await updateProperty(id, updates);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating property:', error);
    return Response.json({ error: 'Failed to update property' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const demoBlock = assertWriteAccess(user);
  if (demoBlock) return demoBlock;

  try {
    const { id } = await params;
    await deleteProperty(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting property:', error);
    return Response.json({ error: 'Failed to delete property' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Manual verification against sandbox**

Start the dev server (`npm run dev`), log in as `renato`, then:
```bash
curl -s -X POST localhost:3000/api/properties -H 'Content-Type: application/json' \
  --cookie "$(cat /tmp/kabuki-cookie.txt 2>/dev/null)" \
  -d '{"name":"Test Property","owner":"joint","estimatedValue":300000,"originalLoanAmount":250000,"interestRate":6,"loanTermYears":30,"loanStartDate":"2024-01-01"}'
```
(If curl-based cookie auth is awkward given NextAuth, verify instead via the actual browser once Task 9's UI exists — note this and move on rather than fighting curl/cookie plumbing.)
Expected: `201` with `{ id: "..." }`; row visible via `psql ... -c "select * from properties;"`. Delete the test row after verifying: `psql postgresql://localhost/kabuki_sandbox -c "delete from properties where name='Test Property';"`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/properties
git commit -m "feat: add properties API routes (list/create/update/delete)"
```

---

### Task 7: Sidebar — Properties section + page tabs

**Files:**
- Modify: `src/components/sidebar.tsx`
- Modify: `src/components/page-tabs.tsx`

**Interfaces:**
- Produces: sidebar renders a "Properties" section with 4 links; `PROPERTIES_TABS` exported for use in each Properties page.

- [ ] **Step 1: Add `Building2` to the icon imports and add a new nav section**

In `src/components/sidebar.tsx`, add `Building2` to the existing `lucide-react` import list, then insert a new section into `navSections` (after `'Track'`, before `'Invest'`, matching the spec's "standalone section"):

```ts
{
  label: 'Properties',
  items: [
    { href: '/properties', label: 'Overview', icon: Building2 },
    { href: '/properties/manage', label: 'Manage', icon: Building2 },
    { href: '/properties/pay-ahead', label: 'Pay-Ahead Calculator', icon: Building2 },
    { href: '/properties/loan-calculator', label: 'Loan Calculator', icon: Building2 },
  ],
},
```

- [ ] **Step 2: Add `PROPERTIES_TABS` to `src/components/page-tabs.tsx`**

```ts
export const PROPERTIES_TABS: PageTab[] = [
  { href: '/properties', label: 'Overview' },
  { href: '/properties/manage', label: 'Manage' },
  { href: '/properties/pay-ahead', label: 'Pay-Ahead Calculator' },
  { href: '/properties/loan-calculator', label: 'Loan Calculator' },
];
```

- [ ] **Step 3: Verify visually**

Run `npm run dev`, load any page, confirm the sidebar shows a "Properties" section with 4 links (they'll 404 until later tasks land — that's expected at this point).

- [ ] **Step 4: Commit**

```bash
git add src/components/sidebar.tsx src/components/page-tabs.tsx
git commit -m "feat: add Properties section to sidebar and page tabs"
```

---

### Task 8: Properties Overview page (`/properties`)

**Files:**
- Create: `src/app/properties/page.tsx`
- Create: `src/components/properties/properties-overview.tsx`

**Interfaces:**
- Consumes: `getAllProperties`, `getCombinedEquitySeries` from `@/lib/properties`; `PROPERTIES_TABS` from Task 7; `AppLayout` from `@/components/app-layout`; `OwnerBadge` from `@/components/owner-badge`.
- Produces: `PropertiesOverview({ properties: PropertyWithComputed[], equitySeries: EquitySeriesPoint[] })` client component.

- [ ] **Step 1: Write the server page**

```tsx
import { AppLayout } from '@/components/app-layout';
import { PageTabs, PROPERTIES_TABS } from '@/components/page-tabs';
import { PropertiesOverview } from '@/components/properties/properties-overview';
import { getAllProperties, getCombinedEquitySeries } from '@/lib/properties';

export const dynamic = 'force-dynamic';

export default async function PropertiesPage() {
  const [properties, equitySeries] = await Promise.all([
    getAllProperties(),
    getCombinedEquitySeries(6),
  ]);

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Properties</h1>
        </div>
        <PageTabs tabs={PROPERTIES_TABS} />
        <PropertiesOverview properties={properties} equitySeries={equitySeries} />
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Write `src/components/properties/properties-overview.tsx`**

`'use client'` component. Content requirements (from spec section 1A):
- Top: a prominent `AreaChart` (Recharts, following `NetWorthChart`'s pattern — `<defs><linearGradient>`, `var(--primary)` stroke, `EmptyChartState` fallback if `equitySeries.length < 2`) plotting `totalEquity` over `equitySeries` (x-axis `label`, one line/area). Show `totalValue` and `totalLoanBalance` as a stacked reference (e.g. a `ComposedChart` with `totalValue` and `totalLoanBalance` as two `Line`s plus `totalEquity` as an `Area`, mirroring `cash-flow-chart.tsx`'s composed-chart pattern) so the combined graph reads as "value vs. remaining balance vs. equity", not equity alone.
- Below: one card per property (`bg-card border border-border rounded-lg p-4`) showing `name`, `OwnerBadge` for `owner`, `estimatedValue`, `remainingBalance`, and `equity` (large, bold, `text-emerald-600` if positive) — each card embeds a small per-property line chart (reuse the same equity math but filtered to a single property; simplest correct approach: compute per-property series client-side from the same `equitySeries`-shaped data passed down, or just show current-state numbers with a `h-24` sparkline of `[estimatedValue - remainingBalance at signup, ..., equity now]` interpolated from `monthlyPayment`/`remainingBalance` — do not block this task on a second server round-trip; a client-computed sparkline off `loanStartDate`/`interestRate`/`originalLoanAmount` via `buildAmortizationSchedule` imported from `@/lib/loan-amortization` is sufficient and keeps this task self-contained).
- Inline edit: each property row has an "Edit loan details" affordance (pencil icon button) that toggles inline `<input>` fields for `estimatedValue`, `originalLoanAmount`, `interestRate`, `loanTermYears`, `loanStartDate` directly in the row (no separate modal — spec explicitly calls this out as *inline*), with Save/Cancel buttons that `PATCH /api/properties/[id]` then `router.refresh()`.
- Empty state: if `properties.length === 0`, show a `bg-card border border-border rounded-lg p-8 text-center` message pointing to "Manage Properties" (`Link href="/properties/manage"`) to add the first one.

- [ ] **Step 3: Verify in browser**

`npm run dev`, log in, visit `/properties`. Confirm: chart renders (once Task 16/18 seed data exists) or empty state shows cleanly if no properties yet; inline edit round-trips through the API and `router.refresh()` reflects the new numbers without a full reload.

- [ ] **Step 4: Commit**

```bash
git add src/app/properties/page.tsx src/components/properties/properties-overview.tsx
git commit -m "feat: add Properties overview page with combined equity chart and inline loan editing"
```

---

### Task 9: Manage Properties page (`/properties/manage`)

**Files:**
- Create: `src/app/properties/manage/page.tsx`
- Create: `src/components/properties/manage-properties-view.tsx`

**Interfaces:**
- Consumes: `getAllProperties` from `@/lib/properties`; hits `POST/PATCH/DELETE /api/properties[...]` from Task 6.
- Produces: `ManagePropertiesView({ properties: PropertyWithComputed[] })` client component.

- [ ] **Step 1: Write the server page**

```tsx
import { AppLayout } from '@/components/app-layout';
import { PageTabs, PROPERTIES_TABS } from '@/components/page-tabs';
import { ManagePropertiesView } from '@/components/properties/manage-properties-view';
import { getAllProperties } from '@/lib/properties';

export const dynamic = 'force-dynamic';

export default async function ManagePropertiesPage() {
  const properties = await getAllProperties();

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Manage Properties</h1>
        </div>
        <PageTabs tabs={PROPERTIES_TABS} />
        <ManagePropertiesView properties={properties} />
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Write `src/components/properties/manage-properties-view.tsx`**

`'use client'` component, following the hand-rolled-modal pattern from `src/components/transaction-edit-modal.tsx` (fixed overlay `<div>`, `useEscapeKey` from `@/hooks/use-escape-key`). Content:
- List of existing properties (`bg-card border border-border rounded-lg divide-y divide-border`), each row: name, address, owner badge, estimated value, edit (pencil) and delete (trash, with a `confirm()`-style inline "Are you sure?" — match whatever confirm pattern `src/app/accounts/page.tsx`'s delete-account flow already uses) buttons.
- "Add Property" button (`btn-primary`) opens the modal with a form: Name (text input), Address (text input), Owner (reuse `OwnerToggle`-style 3-way selector or a plain `<select>` sourced from `OWNERS` keys — a `<select>` is simpler and consistent enough for a form field), Estimated Market Value ($, number input), Original Loan Amount ($, number input), Interest Rate (%, number input, step 0.01), Loan Term (years, number input), Start Date (date input).
- Same modal reused for Edit (pre-filled from the clicked property).
- Submit calls `POST /api/properties` (create) or `PATCH /api/properties/[id]` (edit), then `router.refresh()` and closes the modal. Delete calls `DELETE /api/properties/[id]` then `router.refresh()`.

- [ ] **Step 3: Verify in browser**

`npm run dev`, visit `/properties/manage`, add a property through the form, confirm it appears in the list and on `/properties`; edit it; delete it; confirm each round-trips correctly (check via `psql` that the row actually changed/disappeared).

- [ ] **Step 4: Commit**

```bash
git add src/app/properties/manage src/components/properties/manage-properties-view.tsx
git commit -m "feat: add Manage Properties page with add/edit/delete"
```

---

### Task 10: Pay-Ahead Calculator page (`/properties/pay-ahead`)

**Files:**
- Create: `src/app/properties/pay-ahead/page.tsx`
- Create: `src/components/properties/pay-ahead-calculator.tsx`

**Interfaces:**
- Consumes: `getAllProperties` from `@/lib/properties`; `calculatePayoffWithExtra` from `@/lib/loan-amortization`.
- Produces: `PayAheadCalculator({ properties: PropertyWithComputed[] })` client component.

- [ ] **Step 1: Write the server page**

```tsx
import { AppLayout } from '@/components/app-layout';
import { PageTabs, PROPERTIES_TABS } from '@/components/page-tabs';
import { PayAheadCalculator } from '@/components/properties/pay-ahead-calculator';
import { getAllProperties } from '@/lib/properties';

export const dynamic = 'force-dynamic';

export default async function PayAheadPage() {
  const properties = await getAllProperties();

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Pay-Ahead Calculator</h1>
        </div>
        <PageTabs tabs={PROPERTIES_TABS} />
        <PayAheadCalculator properties={properties} />
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Write `src/components/properties/pay-ahead-calculator.tsx`**

`'use client'` component. Content:
- Property selector (`<select>`) defaulting to `properties[0]`, disabled/empty-state if `properties.length === 0` pointing to `/properties/manage`.
- Extra monthly amount input (`$`, number, default `250`, `useState`).
- On every change, call `calculatePayoffWithExtra(property.originalLoanAmount, property.interestRate, property.loanTermYears, extraMonthly)` client-side (pure function, no API round-trip needed).
- Results panel: "Interest Saved" (`interestSaved`, large `text-emerald-600`), "Time Saved" (`monthsSaved` converted to years/months), "New Payoff Date" (computed from `property.loanStartDate` + `newMonths`), all styled as stat cards matching the Invest Options page's 4-stat grid pattern (`grid-cols-1 md:grid-cols-3`, `bg-card border border-border rounded-lg p-4`).
- A comparison chart: two `Line`s (original balance-over-time vs. new balance-over-time) built from `buildAmortizationSchedule` twice — once with the base payment, once by re-running the extra-payment loop and capturing balances per month (extract a small local helper that mirrors `calculatePayoffWithExtra`'s loop but records `balance` per month instead of just the summary — inline in this component is fine, it's presentation-only and doesn't need to live in the shared lib).

- [ ] **Step 3: Verify in browser**

`npm run dev`, visit `/properties/pay-ahead`, change the extra-payment amount, confirm the stats and chart update live and the numbers are directionally sane (more extra payment → more interest saved, shorter payoff).

- [ ] **Step 4: Commit**

```bash
git add src/app/properties/pay-ahead src/components/properties/pay-ahead-calculator.tsx
git commit -m "feat: add Pay-Ahead Calculator page"
```

---

### Task 11: Standalone Loan Calculator page (`/properties/loan-calculator`) + shared amortization table

**Files:**
- Create: `src/app/properties/loan-calculator/page.tsx`
- Create: `src/components/properties/loan-calculator-view.tsx`
- Create: `src/components/properties/amortization-table.tsx`

**Interfaces:**
- Consumes: `calculateMonthlyPayment`, `buildAmortizationSchedule` from `@/lib/loan-amortization`.
- Produces: `AmortizationTable({ rows: AmortizationRow[] })` (shared, paginated/collapsible table — also reusable from Task 10 if useful, though Task 10 doesn't require it).

- [ ] **Step 1: Write `src/components/properties/amortization-table.tsx`**

`'use client'`. Renders an HTML `<table>` (matching the Invest Options page's table styling) with columns Month, Payment, Principal, Interest, Balance, formatted via `formatCurrency` from `@/lib/format`. Given a 30-year loan is 360 rows, render only a windowed subset by default (first 12 rows + a "Show full schedule" toggle that renders all rows — avoid an unbounded DOM for the default case) — `useState<boolean>` for expanded.

- [ ] **Step 2: Write the server page (no DB — pure calculator, but kept as an async server component for structural consistency with the rest of the section)**

```tsx
import { AppLayout } from '@/components/app-layout';
import { PageTabs, PROPERTIES_TABS } from '@/components/page-tabs';
import { LoanCalculatorView } from '@/components/properties/loan-calculator-view';

export default function LoanCalculatorPage() {
  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Loan Calculator</h1>
        </div>
        <PageTabs tabs={PROPERTIES_TABS} />
        <LoanCalculatorView />
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 3: Write `src/components/properties/loan-calculator-view.tsx`**

`'use client'`. Inputs: Loan Amount, Interest Rate (%), Term (years) — all `useState<number>` with sane defaults (`400000`, `6.5`, `30`). Live-computed via `calculateMonthlyPayment` and `buildAmortizationSchedule`: monthly P&I payment (large stat), total loan cost (`payment * termYears * 12`), total interest (`totalCost - loanAmount`), each as a stat card. Below: `<AmortizationTable rows={buildAmortizationSchedule(loanAmount, rate, termYears)} />`.

- [ ] **Step 4: Verify in browser**

`npm run dev`, visit `/properties/loan-calculator`, change inputs, confirm live recompute and that the amortization table's last row's `balance` is `0` (within rounding).

- [ ] **Step 5: Commit**

```bash
git add src/app/properties/loan-calculator src/components/properties/loan-calculator-view.tsx src/components/properties/amortization-table.tsx
git commit -m "feat: add standalone Loan Calculator page with amortization table"
```

---

### Task 12: Net worth exclusion audit

**Files:**
- Read-only check across: `src/lib/net-worth.ts`, `src/lib/queries.ts`, `src/components/home/home-overview.tsx`, `src/components/home/net-worth-view.tsx`, `src/app/accounts/page.tsx`

**Interfaces:**
- Consumes: nothing new — this is a verification-only task confirming Task 1-9's structural exclusion actually holds.

- [ ] **Step 1: Confirm no new code path touches `accounts`/net-worth aggregation**

`grep -rn "properties\|holdings" src/lib/net-worth.ts src/lib/queries.ts src/components/home/home-overview.tsx src/components/home/net-worth-view.tsx src/app/accounts/page.tsx` — expected: **zero matches**. If any match exists, something outside this plan wired properties/holdings into net worth and must be reverted; investigate before proceeding.

- [ ] **Step 2: Confirm no seeded data creates `assetType: 'property'` accounts**

`grep -n "assetType.*property\|asset_type.*property" src/db/seed.ts` — expected: zero matches once Task 16-18 land (properties must be seeded via the new `properties` table, never as `accounts` rows).

- [ ] **Step 3: Manual confirmation in browser**

After Task 16-18 seed data exists, load `/home` and `/home/net-worth`, note the net worth figure, then load `/properties` and note the combined equity/value figures. Confirm the two numbers are independent — property value/equity must not appear anywhere in the `/home` net worth total or asset breakdown.

- [ ] **Step 4: No commit needed** (verification-only task; if Step 1 or 2 find a violation, fix it and commit that fix with message `fix: exclude properties/holdings from net worth aggregation`).

---

### Task 13: Wire `/invest` Holdings to real seeded data

**Files:**
- Modify: `src/app/invest/page.tsx`
- Create: `src/components/invest/holdings-view.tsx`

**Interfaces:**
- Consumes: `getAllHoldings`, `getAllocation` from `@/lib/holdings` (Task 5).
- Produces: `HoldingsView({ holdings: HoldingWithValue[], allocation: AllocationSlice[] })` client component replacing the current page's inline mock-data JSX.

- [ ] **Step 1: Read the current `src/app/invest/page.tsx` in full before editing**

Confirm exactly which local arrays (`PORTFOLIO_CHART_DATA`, `HOLDING_CHARTS`, `ALLOCATION_DATA`, `HOLDINGS`) and JSX blocks need to move into the new client component vs. be replaced with real data.

- [ ] **Step 2: Convert `src/app/invest/page.tsx` to an async server component**

```tsx
import { AppLayout } from '@/components/app-layout';
import { HoldingsView } from '@/components/invest/holdings-view';
import { getAllHoldings, getAllocation } from '@/lib/holdings';

export const dynamic = 'force-dynamic';

export default async function InvestPage() {
  const [holdings, allocation] = await Promise.all([getAllHoldings(), getAllocation()]);

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Invest</h1>
        </div>
        <HoldingsView holdings={holdings} allocation={allocation} />
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 3: Write `src/components/invest/holdings-view.tsx`**

`'use client'`. Move the existing page's UI structure (portfolio total card, per-holding cards with sparkline, `PieChart` allocation with legend) here, replacing the mock arrays: total portfolio value = `holdings.reduce((sum, h) => sum + h.currentValue, 0)`; per-holding cards iterate `holdings` (symbol, name, shares, currentValue, gainLoss/gainLossPct colored green/red); allocation `PieChart` data comes from the `allocation` prop (`assetClass`, `value`, `pct`), using `var(--chart-1)` through `var(--chart-5)` for `Cell` fills instead of the old hardcoded hex array. Drop the portfolio-value-over-time sparkline if there's no `accountBalanceHistory` for the brokerage account backing it yet — check Task 17 first; if that task seeds balance history for the brokerage account, wire the sparkline to it via a small inline query in the server page instead of inventing a new lib function for one chart.

- [ ] **Step 4: Verify in browser**

`npm run dev`, visit `/invest` after Task 17's seed data exists, confirm real VTI/VXUS/BND holdings render with correct totals and the allocation pie sums to 100%.

- [ ] **Step 5: Commit**

```bash
git add src/app/invest/page.tsx src/components/invest/holdings-view.tsx
git commit -m "feat: wire Invest holdings page to real seeded data"
```

---

### Task 14: Invest > Options — search bar + strategy tooltips

**Files:**
- Create: `src/components/ui/tooltip.tsx`
- Modify: `src/app/invest/options/page.tsx`

**Interfaces:**
- Produces: `Tooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode })` built on `@base-ui/react`'s tooltip primitive, following the `cva`-wrapped pattern in `src/components/ui/button.tsx`.

- [ ] **Step 1: Write `src/components/ui/tooltip.tsx`**

```tsx
'use client';

import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import type { ReactNode } from 'react';

export function Tooltip({ children, content }: { children: ReactNode; content: ReactNode }) {
  return (
    <BaseTooltip.Root delay={150}>
      <BaseTooltip.Trigger render={<span className="inline-flex" />}>
        {children}
      </BaseTooltip.Trigger>
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner sideOffset={8}>
          <BaseTooltip.Popup className="z-50 max-w-xs rounded-lg border border-border bg-popover text-popover-foreground shadow-md p-3 text-sm">
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
```

If `@base-ui/react/tooltip` doesn't export `Root`/`Trigger`/`Portal`/`Positioner`/`Popup` under those exact names (verify via `node_modules/@base-ui/react/tooltip/index.d.ts` or the package's own docs before writing this file — the button import path `@base-ui/react/button` is confirmed but tooltip's exact API isn't), adjust to match the actual export shape; the wrapper's external interface (`Tooltip({ children, content })`) must stay the same either way so Step 3 doesn't need to change.

- [ ] **Step 2: Read `src/app/invest/options/page.tsx` in full before editing**

Confirm exact current structure of the "Strategy Guide" 2-column grid (Bullish/Bearish cards) referenced in the codebase report.

- [ ] **Step 3: Add search bar**

At the top of the page content (above the 4-stat summary grid), add a non-functional search input:

```tsx
<div className="relative mb-4">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <input
    type="text"
    placeholder="Search options plays..."
    className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground"
    disabled
  />
</div>
```
(`Search` from `lucide-react`; `disabled` makes the "non-functional" placeholder explicit rather than silently doing nothing on interaction.)

- [ ] **Step 4: Add hover tooltips to Bullish/Bearish strategy cards**

Wrap each strategy card's title/icon in `<Tooltip content={...}>`. Bullish tooltip content, green-themed (`text-emerald-600`/`bg-emerald-500/10` accents):
```tsx
<div className="space-y-1">
  <p className="font-semibold text-emerald-600">Bullish Execution</p>
  <p className="text-muted-foreground">Buy calls to profit from upside, or sell cash-secured puts to collect premium while targeting a lower entry price.</p>
</div>
```
Bearish tooltip content, red/amber-themed (`text-red-600`/`bg-red-500/10` accents):
```tsx
<div className="space-y-1">
  <p className="font-semibold text-red-600">Bearish Execution</p>
  <p className="text-muted-foreground">Buy puts to profit from downside, or sell covered calls against existing shares to collect premium while capping upside.</p>
</div>
```

- [ ] **Step 5: Verify in browser**

`npm run dev`, visit `/invest/options`, confirm the search input renders (and does nothing on type, as intended), hover each strategy card and confirm the correct color-themed tooltip appears.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/tooltip.tsx src/app/invest/options/page.tsx
git commit -m "feat: add search bar and strategy tooltips to Invest Options page"
```

---

### Task 15: Predictions page consistency pass

**Files:**
- Modify (if needed): `src/app/invest/predictions/page.tsx`

**Interfaces:** none new.

- [ ] **Step 1: Read the current page and compare against Options/Holdings styling**

`/invest/predictions` already exists per the codebase report (amber disclaimer banner, 3-stat grid, line chart, table, sentiment/risk grid). Spec section 2B only asks it stay "a clean, styled dummy/placeholder page consistent with the rest of the invest section" — no new functionality requested.

- [ ] **Step 2: Fix only genuine inconsistencies**

Check: does it use `AppLayout` the same way as `options/page.tsx` and the new `invest/page.tsx`? Do stat cards use the same `bg-card border border-border rounded-lg p-4` classes? If everything already matches, make no changes — do not add scope here. If something is visibly inconsistent (e.g. different card radius/padding), fix only that.

- [ ] **Step 3: Verify in browser, commit only if a change was made**

```bash
git add src/app/invest/predictions/page.tsx
git commit -m "fix: align Predictions page styling with rest of Invest section"
```
(Skip the commit entirely if Step 2 made no changes.)

---

### Task 16: Seed — Renato & Claudia manual accounts (cash, credit, auto loan) + 6 months balance history

**Files:**
- Modify: `src/db/seed.ts`

**Interfaces:**
- Consumes: existing `rentoId`, `claudiaId` already generated in `seed()`; `accounts`, `accountBalanceHistory`, `plaidItems` from `@/db/schema`.
- Produces: manual `plaidItems` rows (one per user, `isManual: true`) each with checking, savings, credit card accounts, plus a joint auto loan account; `accountBalanceHistory` rows spanning 6 months for each.

- [ ] **Step 1: Add manual household accounts, targeting the spec's totals**

Insert a new block in `seed()` (after the demo-account block, before `console.log('✅ Seed complete!')`), guarded by its own `try/catch` like the existing blocks. Total liquid cash ~$18,400 across both users' checking+savings; credit card balances ~$3,200 total; auto loan ~$14,500. Example split (adjust proportions freely as long as totals match): Renato checking $6,200, Renato savings $4,800, Claudia checking $4,100, Claudia savings $3,300 (sums to $18,400); Renato credit card -$1,850, Claudia credit card -$1,350 (sums to -$3,200); one joint auto loan liability -$14,500.

```ts
try {
  const renatoManualItemId = generateId();
  const claudiaManualItemId = generateId();

  await db.insert(plaidItems).values([
    { id: renatoManualItemId, userId: rentoId, itemId: `manual-${rentoId}`, accessToken: 'manual', institutionName: 'Manual Accounts', isManual: true, createdAt: new Date(), updatedAt: new Date() },
    { id: claudiaManualItemId, userId: claudiaId, itemId: `manual-${claudiaId}`, accessToken: 'manual', institutionName: 'Manual Accounts', isManual: true, createdAt: new Date(), updatedAt: new Date() },
  ]).onConflictDoNothing({ target: plaidItems.itemId });

  const householdAccounts = [
    { id: 'seed-acct-renato-checking', plaidItemId: renatoManualItemId, name: 'Renato Checking', owner: 'renato', type: 'depository', subtype: 'checking', kind: 'asset', balance: 6200 },
    { id: 'seed-acct-renato-savings', plaidItemId: renatoManualItemId, name: 'Renato Savings', owner: 'renato', type: 'depository', subtype: 'savings', kind: 'asset', balance: 4800 },
    { id: 'seed-acct-claudia-checking', plaidItemId: claudiaManualItemId, name: 'Claudia Checking', owner: 'claudia', type: 'depository', subtype: 'checking', kind: 'asset', balance: 4100 },
    { id: 'seed-acct-claudia-savings', plaidItemId: claudiaManualItemId, name: 'Claudia Savings', owner: 'claudia', type: 'depository', subtype: 'savings', kind: 'asset', balance: 3300 },
    { id: 'seed-acct-renato-credit', plaidItemId: renatoManualItemId, name: 'Renato Credit Card', owner: 'renato', type: 'credit', subtype: 'credit card', kind: 'liability', liabilityType: 'credit_card', balance: -1850 },
    { id: 'seed-acct-claudia-credit', plaidItemId: claudiaManualItemId, name: 'Claudia Credit Card', owner: 'claudia', type: 'credit', subtype: 'credit card', kind: 'liability', liabilityType: 'credit_card', balance: -1350 },
    { id: 'seed-acct-auto-loan', plaidItemId: renatoManualItemId, name: 'Auto Loan', owner: 'joint', type: 'loan', subtype: 'auto', kind: 'liability', liabilityType: 'other', balance: -14500 },
  ] as const;

  await db.insert(accounts).values(
    householdAccounts.map((a) => ({
      id: a.id,
      plaidItemId: a.plaidItemId,
      plaidAccountId: a.id,
      name: a.name,
      owner: a.owner,
      type: a.type,
      subtype: a.subtype,
      kind: a.kind,
      liabilityType: 'liabilityType' in a ? a.liabilityType : null,
      isManual: true,
      currentBalance: a.balance.toFixed(2),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  ).onConflictDoNothing({ target: accounts.plaidAccountId });

  // 6 months of gently-trending balance history so every account chart has data on first load.
  const now = new Date();
  const historyRows: { id: string; accountId: string; balance: string; recordedAt: Date }[] = [];
  for (const acct of householdAccounts) {
    for (let monthsAgo = 6; monthsAgo >= 0; monthsAgo--) {
      const recordedAt = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 15);
      // Liabilities trend slightly down (being paid off); assets trend slightly up (saving).
      const drift = acct.kind === 'liability' ? monthsAgo * 0.015 : -monthsAgo * 0.02;
      const balance = acct.balance * (1 + drift);
      historyRows.push({
        id: generateId(),
        accountId: acct.id,
        balance: balance.toFixed(2),
        recordedAt,
      });
    }
  }
  await db.insert(accountBalanceHistory).values(historyRows);

  console.log('✓ Household manual accounts + 6mo balance history ensured (renato, claudia)');
} catch (error) {
  console.error('Error creating household accounts:', error);
}
```

- [ ] **Step 2: Run the seed script against sandbox**

Run: `npm run db:seed`
Expected: `✓ Household manual accounts + 6mo balance history ensured (renato, claudia)` printed, no errors.

- [ ] **Step 3: Verify totals via `psql`**

```bash
psql postgresql://localhost/kabuki_sandbox -c "select sum(current_balance) from accounts where kind='asset' and subtype in ('checking','savings');"
psql postgresql://localhost/kabuki_sandbox -c "select sum(current_balance) from accounts where liability_type='credit_card';"
psql postgresql://localhost/kabuki_sandbox -c "select current_balance from accounts where name='Auto Loan';"
```
Expected: first sum ≈ `18400.00`, second sum ≈ `-3200.00`, third ≈ `-14500.00`.

- [ ] **Step 4: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat(seed): add Renato/Claudia household cash, credit, and auto loan accounts with 6mo history"
```

---

### Task 17: Seed — investment brokerage account + holdings (~$42k)

**Files:**
- Modify: `src/db/seed.ts`

**Interfaces:**
- Consumes: `holdings` table from Task 1; reuses `renatoManualItemId` from Task 16 (declare it at a scope reachable from this new block, or `let` it outside both try blocks if Task 16 and this task land as separate edits to the same function — check the actual variable scope when implementing and adjust rather than redeclaring).

- [ ] **Step 1: Add a joint brokerage account + holdings**

```ts
try {
  const brokerageAccountId = 'seed-acct-brokerage';
  await db.insert(accounts).values({
    id: brokerageAccountId,
    plaidItemId: renatoManualItemId,
    plaidAccountId: brokerageAccountId,
    name: 'Joint Brokerage',
    owner: 'joint',
    type: 'brokerage',
    subtype: 'brokerage',
    kind: 'asset',
    isManual: true,
    currentBalance: '42000.00',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoNothing({ target: accounts.plaidAccountId });

  // Shares * currentPrice per row sums to ~$42,000 across the three funds.
  const holdingsSeed = [
    { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', assetClass: 'us_stock', shares: 68, costBasis: 15800, currentPrice: 285.50 },
    { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', assetClass: 'intl_stock', shares: 180, costBasis: 9200, currentPrice: 62.30 },
    { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', assetClass: 'bond', shares: 220, costBasis: 16000, currentPrice: 72.10 },
  ];
  await db.insert(holdings).values(
    holdingsSeed.map((h) => ({
      id: generateId(),
      accountId: brokerageAccountId,
      symbol: h.symbol,
      name: h.name,
      assetClass: h.assetClass,
      shares: h.shares.toFixed(4),
      costBasis: h.costBasis.toFixed(2),
      currentPrice: h.currentPrice.toFixed(4),
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  );

  // 6 months of gently-rising portfolio value for the /invest sparkline.
  const now = new Date();
  const brokerageHistory = [];
  for (let monthsAgo = 6; monthsAgo >= 0; monthsAgo--) {
    const recordedAt = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 15);
    const balance = 42000 * (1 - monthsAgo * 0.015);
    brokerageHistory.push({ id: generateId(), accountId: brokerageAccountId, balance: balance.toFixed(2), recordedAt });
  }
  await db.insert(accountBalanceHistory).values(brokerageHistory);

  console.log('✓ Investment brokerage account + holdings ensured');
} catch (error) {
  console.error('Error creating investment holdings:', error);
}
```

Verify `68*285.50 + 180*62.30 + 220*72.10 = 19414 + 11214 + 15862 = 46490` — adjust share counts before finalizing so the total lands close to $42,000 (the numbers above are illustrative; recompute precisely when writing this file so `sum(shares*currentPrice) ≈ 42000`. Target split roughly 55% VTI / 20% VXUS / 25% BND by value is a reasonable realistic allocation — pick share counts that hit both the per-fund prices given and the ~$42k total).

- [ ] **Step 2: Run seed, verify total**

Run: `npm run db:seed`
Then: `psql postgresql://localhost/kabuki_sandbox -c "select h.symbol, h.shares::numeric * h.current_price::numeric as value from holdings h;"` and sum manually — expected total within a few hundred dollars of `42000`.

- [ ] **Step 3: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat(seed): add investment brokerage account with VTI/VXUS/BND holdings (~\$42k)"
```

---

### Task 18: Seed — 2 properties + 6 months value history

**Files:**
- Modify: `src/db/seed.ts`

**Interfaces:**
- Consumes: `properties`, `propertyValueHistory` from `@/db/schema`.

- [ ] **Step 1: Add the two properties with backfilled value history**

```ts
try {
  const propertySeed = [
    {
      id: 'seed-property-primary-home',
      name: 'Primary Home',
      address: '482 Maple Ridge Dr',
      owner: 'joint',
      estimatedValue: 385000,
      originalLoanAmount: 310000,
      interestRate: 6.2,
      loanTermYears: 30,
      loanStartDate: new Date(new Date().getFullYear() - 2, 2, 1),
    },
    {
      id: 'seed-property-rental-condo',
      name: 'Rental Condo',
      address: '17 Harborview Unit 4B',
      owner: 'joint',
      estimatedValue: 220000,
      originalLoanAmount: 175000,
      interestRate: 5.5,
      loanTermYears: 30,
      loanStartDate: new Date(new Date().getFullYear() - 3, 8, 1),
    },
  ];

  await db.insert(properties).values(
    propertySeed.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      owner: p.owner,
      estimatedValue: p.estimatedValue.toFixed(2),
      originalLoanAmount: p.originalLoanAmount.toFixed(2),
      interestRate: p.interestRate.toFixed(3),
      loanTermYears: p.loanTermYears,
      loanStartDate: p.loanStartDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  ).onConflictDoNothing({ target: properties.id });

  // 6 months of gently-appreciating value history per property.
  const now = new Date();
  const valueHistoryRows = [];
  for (const p of propertySeed) {
    for (let monthsAgo = 6; monthsAgo >= 0; monthsAgo--) {
      const recordedAt = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 10);
      const value = p.estimatedValue * (1 - monthsAgo * 0.004);
      valueHistoryRows.push({ id: generateId(), propertyId: p.id, value: value.toFixed(2), recordedAt });
    }
  }
  await db.insert(propertyValueHistory).values(valueHistoryRows);

  console.log('✓ Properties + 6mo value history ensured (Primary Home, Rental Condo)');
} catch (error) {
  console.error('Error creating properties:', error);
}
```

Note: `properties.id` has no unique constraint by itself beyond the primary key, so `onConflictDoNothing({ target: properties.id })` is correct (primary key is a valid conflict target).

- [ ] **Step 2: Run seed, verify**

Run: `npm run db:seed`
Then: `psql postgresql://localhost/kabuki_sandbox -c "select name, estimated_value, original_loan_amount, interest_rate from properties;"`
Expected: two rows matching the spec's numbers (Primary Home $385,000/$310,000/6.2%, Rental Condo $220,000/$175,000/5.5%).

- [ ] **Step 3: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat(seed): add Primary Home and Rental Condo properties with 6mo value history"
```

---

### Task 19: Seed — 6 months of household transactions (cash flow charts)

**Files:**
- Modify: `src/db/seed.ts`

**Interfaces:**
- Consumes: `transactions`, `categories` from `@/db/schema`; `defaultCategories` already defined in `seed.ts`; `normalizeMerchant` from `@/lib/spending-insights` (already imported).

- [ ] **Step 1: Add a deterministic 6-month transaction generator**

Add a local helper function above `seed()`:

```ts
interface SeedTxnTemplate {
  merchant: string;
  categoryName: string;
  amount: number; // positive = credit/income, negative = debit/expense
  dayOfMonth: number;
  accountId: string;
}

function buildSixMonthsOfTransactions(accountIds: { checking: string; credit: string }[]): SeedTxnTemplate[] {
  const templates: SeedTxnTemplate[] = [];
  const monthlyPattern: Omit<SeedTxnTemplate, 'accountId'>[] = [
    { merchant: 'Employer Payroll', categoryName: 'Income', amount: 5200, dayOfMonth: 1 },
    { merchant: 'Employer Payroll', categoryName: 'Income', amount: 5200, dayOfMonth: 15 },
    { merchant: 'Whole Foods', categoryName: 'Groceries', amount: -145, dayOfMonth: 3 },
    { merchant: 'Trader Joe\'s', categoryName: 'Groceries', amount: -85, dayOfMonth: 17 },
    { merchant: 'Chipotle', categoryName: 'Dining', amount: -32, dayOfMonth: 5 },
    { merchant: 'Local Bistro', categoryName: 'Dining', amount: -78, dayOfMonth: 20 },
    { merchant: 'Shell Gas', categoryName: 'Transport', amount: -55, dayOfMonth: 8 },
    { merchant: 'City Utilities', categoryName: 'Utilities', amount: -180, dayOfMonth: 10 },
    { merchant: 'Amazon', categoryName: 'Shopping', amount: -120, dayOfMonth: 12 },
    { merchant: 'Netflix', categoryName: 'Subscription', amount: -15.99, dayOfMonth: 2 },
    { merchant: 'Planet Fitness', categoryName: 'Fitness', amount: -24.99, dayOfMonth: 4 },
  ];

  for (let monthsAgo = 6; monthsAgo >= 0; monthsAgo--) {
    const now = new Date();
    const month = now.getMonth() - monthsAgo;
    for (const entry of monthlyPattern) {
      const accountId = entry.amount > 0 ? accountIds[0].checking : accountIds[monthsAgo % accountIds.length].credit;
      templates.push({ ...entry, accountId });
    }
  }
  return templates;
}
```

(This is illustrative scaffolding — when implementing, replace the `accountId` selection logic above with something concrete: e.g. always post income to `seed-acct-renato-checking`, and split expenses deterministically between `seed-acct-renato-credit` and `seed-acct-claudia-credit` by `monthsAgo % 2`. Keep it simple and deterministic; realism matters more than randomness here.)

Then in `seed()`, after the Task 16-18 blocks:

```ts
try {
  const categoryRows = await db.query.categories.findMany();
  const categoryIdByName = new Map(categoryRows.map((c) => [c.name, c.id]));
  const now = new Date();
  const txnRows = [];

  for (let monthsAgo = 6; monthsAgo >= 0; monthsAgo--) {
    const month = now.getMonth() - monthsAgo;
    const pattern = [
      { merchant: 'Employer Payroll', categoryName: 'Income', amount: 5200, day: 1, accountId: 'seed-acct-renato-checking', type: 'credit' as const },
      { merchant: 'Employer Payroll', categoryName: 'Income', amount: 4800, day: 15, accountId: 'seed-acct-claudia-checking', type: 'credit' as const },
      { merchant: 'Whole Foods', categoryName: 'Groceries', amount: -145, day: 3, accountId: monthsAgo % 2 === 0 ? 'seed-acct-renato-credit' : 'seed-acct-claudia-credit', type: 'debit' as const },
      { merchant: "Trader Joe's", categoryName: 'Groceries', amount: -85, day: 17, accountId: 'seed-acct-claudia-credit', type: 'debit' as const },
      { merchant: 'Chipotle', categoryName: 'Dining', amount: -32, day: 5, accountId: 'seed-acct-renato-credit', type: 'debit' as const },
      { merchant: 'Local Bistro', categoryName: 'Dining', amount: -78, day: 20, accountId: 'seed-acct-claudia-credit', type: 'debit' as const },
      { merchant: 'Shell Gas', categoryName: 'Transport', amount: -55, day: 8, accountId: 'seed-acct-renato-credit', type: 'debit' as const },
      { merchant: 'City Utilities', categoryName: 'Utilities', amount: -180, day: 10, accountId: 'seed-acct-renato-checking', type: 'debit' as const },
      { merchant: 'Amazon', categoryName: 'Shopping', amount: -120, day: 12, accountId: 'seed-acct-claudia-credit', type: 'debit' as const },
      { merchant: 'Netflix', categoryName: 'Subscription', amount: -15.99, day: 2, accountId: 'seed-acct-renato-credit', type: 'debit' as const },
      { merchant: 'Planet Fitness', categoryName: 'Fitness', amount: -24.99, day: 4, accountId: 'seed-acct-claudia-credit', type: 'debit' as const },
    ];

    for (const entry of pattern) {
      txnRows.push({
        id: generateId(),
        accountId: entry.accountId,
        categoryId: categoryIdByName.get(entry.categoryName) ?? null,
        categorySource: 'rule',
        plaidTransactionId: `seed-txn-${entry.merchant.replace(/\s+/g, '-')}-${monthsAgo}`,
        name: entry.merchant,
        merchant: entry.merchant,
        merchantCleanedUp: entry.merchant,
        amount: entry.amount.toFixed(2),
        type: entry.type,
        date: new Date(now.getFullYear(), month, entry.day),
        pending: false,
        hidden: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  await db.insert(transactions).values(txnRows).onConflictDoNothing({ target: transactions.plaidTransactionId });
  console.log(`✓ ${txnRows.length} household transactions seeded across 6 months`);
} catch (error) {
  console.error('Error creating household transactions:', error);
}
```

Delete the earlier illustrative `buildSixMonthsOfTransactions`/`SeedTxnTemplate` scaffolding if it isn't the version actually used — don't leave dead code in `seed.ts`.

- [ ] **Step 2: Run seed, verify via UI**

Run: `npm run db:seed`, then `npm run dev`, log in as `renato`, visit `/spending`, `/home/cash-flow`, `/spending/budget` — confirm charts populate with 6 months of data and no empty states remain for the household users (demo user is separate and already had its own generator).

- [ ] **Step 3: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat(seed): backfill 6 months of household transactions for cash flow and budget charts"
```

---

### Task 20: Full-flow verification

**Files:** none (verification only).

- [ ] **Step 1: Fresh seed from scratch**

Confirm sandbox is targeted (`echo $DATABASE_URL` or check `envs/.env.sandbox`/`.env.local` — must point at `kabuki_sandbox`, never production), then run `npm run db:seed` one more time to confirm full idempotency (re-running must not error or duplicate rows — check `onConflictDoNothing` targets cover every insert added in Tasks 16-19).

- [ ] **Step 2: `npm run build`**

Run: `npm run build`
Expected: clean build, no type errors, no missing-import errors across every new file in this plan.

- [ ] **Step 3: Manual walkthrough**

`npm run dev`, log in as `renato`, and visit in order: `/home` (net worth unaffected by properties), `/properties` (equity chart + 2 property cards populated), `/properties/manage` (2 properties listed, add/edit/delete work), `/properties/pay-ahead` (calculator responds live), `/properties/loan-calculator` (works standalone with no property selected), `/invest` (real VTI/VXUS/BND holdings, allocation pie sums to 100%), `/invest/options` (search bar present, tooltips work on hover), `/invest/predictions` (still clean/styled, no regressions), `/spending` and `/home/cash-flow` (6 months of transaction history render, no empty-chart states).

- [ ] **Step 4: Report any gaps found back against this plan's task list rather than silently patching around them** — if something doesn't match spec, it's a signal a prior task needs revisiting, not a one-off fix.
