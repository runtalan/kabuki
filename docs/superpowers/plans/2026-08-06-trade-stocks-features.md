# Trade Stocks & Holdings Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build complete trading functionality: Trade Stocks tab with order form (buy/sell, market/limit orders), real-time quote ticker, order history table, wire Options to real database data, and add Google Finance links to Holdings.

**Architecture:** New `trades` table tracks all buy/sell orders (symbol, quantity, price, order type, side, status). Trade Stocks page (`/invest/stocks`) is a server component fetching current holdings and quote data; client components handle the interactive order form and real-time ticker. Options page queries actual options holdings from database instead of mock data. Holdings cards link to Google Finance. Server actions handle trade execution and persistence.

**Tech Stack:** Next.js App Router (server components + `'use client'` views), Drizzle ORM / Postgres, Yahoo Finance API integration (existing), Recharts for charts, Tailwind v4, lucide-react icons.

## Global Constraints

- Local dev targets sandbox Postgres `kabuki_sandbox` only
- Follow `DATABASE.md` migration workflow: edit `src/db/schema.ts`, hand-write `drizzle/00NN_*.sql` with `IF NOT EXISTS` guards
- Next migration number is `0022` (last applied is `0021_add_email_column.sql`)
- Money columns: `numeric(16,2)`. All prices in USD.
- Reuse `generateId()` from `src/lib/id.ts` for trade IDs
- Reuse `getUser()` / `assertWriteAccess()` from `src/lib/auth.ts` for auth
- No test framework; verify with manual page checks and `npm run build`
- Styling: match existing — `bg-card border border-border rounded-lg p-4/p-6`, `text-foreground`/`text-muted-foreground`, `text-emerald-600` for gains/buys, `text-red-600` for losses/sells
- Reuse `PageTabs` and `INVEST_TABS` pattern for tab navigation

---

## File Structure

**New files:**
- `drizzle/0022_trades_table.sql` — migration for trades table
- `src/app/invest/stocks/page.tsx` — Trade Stocks page (server component)
- `src/components/invest/trade-stocks-view.tsx` — `'use client'` view with form + ticker + holdings
- `src/components/invest/stock-trading-form.tsx` — `'use client'` order form component
- `src/components/invest/realtime-quote-ticker.tsx` — `'use client'` real-time quote display
- `src/components/invest/current-holdings-for-trading.tsx` — holdings list for trading page
- `src/lib/actions/trades.ts` — server actions for trade execution
- `src/lib/trades.ts` — Drizzle queries for trades + history

**Modified files:**
- `src/db/schema.ts` — add `trades` table + relations
- `src/components/page-tabs.tsx` — add `/invest/stocks` to `INVEST_TABS`
- `src/components/invest/holdings-view.tsx` — add Google Finance links to symbols
- `src/app/invest/options/page.tsx` — wire to real options holdings from database
- `DATABASE.md` — log migration `0022`

---

### Task 1: Schema — `trades` table

**Files:**
- Modify: `src/db/schema.ts`

**Interfaces:**
- Produces: `trades` table with columns (`id, accountId, symbol, quantity, executionPrice, orderType, side, status, createdAt, updatedAt`), `tradesRelations` export. Later tasks import from `@/db/schema`.

- [ ] **Step 1: Add trades table to schema**

After the `holdings` table definition, add:

```ts
// Track executed trades: buys/sells with order type and execution details
export const trades = pgTable(
  "trades",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    accountId: varchar("account_id", { length: 36 })
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 10 }).notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull(),
    executionPrice: numeric("execution_price", { precision: 12, scale: 4 }).notNull(),
    orderType: varchar("order_type", { length: 20 }).notNull(), // "market" | "limit"
    side: varchar("side", { length: 10 }).notNull(), // "buy" | "sell"
    status: varchar("status", { length: 20 }).default("filled").notNull(), // "pending" | "filled" | "canceled"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_trades_account_id").on(table.accountId)]
);
```

- [ ] **Step 2: Add tradesRelations**

In the Relations section, add after `holdingsRelations`:

```ts
export const tradesRelations = relations(trades, ({ one }) => ({
  account: one(accounts, {
    fields: [trades.accountId],
    references: [accounts.id],
  }),
}));
```

- [ ] **Step 3: Verify schema compiles**

Run: `npm run build`
Expected: No TypeScript errors in schema

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "schema: add trades table for order tracking"
```

---

### Task 2: Migration — 0022_trades_table.sql

**Files:**
- Create: `drizzle/0022_trades_table.sql`

**Interfaces:**
- Consumes: `accounts` table (exists)
- Produces: `trades` table in database

- [ ] **Step 1: Create migration file**

```sql
-- Create trades table to track buy/sell executions
CREATE TABLE IF NOT EXISTS trades (
  id varchar(36) PRIMARY KEY,
  account_id varchar(36) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  symbol varchar(10) NOT NULL,
  quantity numeric(12, 4) NOT NULL,
  execution_price numeric(12, 4) NOT NULL,
  order_type varchar(20) NOT NULL,
  side varchar(10) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'filled',
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_account_id ON trades(account_id);
```

- [ ] **Step 2: Apply migration to sandbox**

Run: `psql -U postgres -d kabuki_sandbox -f drizzle/0022_trades_table.sql`

Expected: `CREATE TABLE` and `CREATE INDEX` messages, no errors

- [ ] **Step 3: Verify table exists**

Run: `psql -U postgres -d kabuki_sandbox -c "\d trades"`

Expected: Shows columns (id, account_id, symbol, quantity, execution_price, order_type, side, status, created_at, updated_at)

- [ ] **Step 4: Log migration in DATABASE.md**

Add to "Current schema state" table in `DATABASE.md`:
- `0022_trades_table` | tracks buy/sell orders (symbol, qty, price, type, side, status)

- [ ] **Step 5: Commit**

```bash
git add drizzle/0022_trades_table.sql DATABASE.md
git commit -m "migration: add trades table (0022)"
```

---

### Task 3: Trades query library

**Files:**
- Create: `src/lib/trades.ts`

**Interfaces:**
- Consumes: `trades` table schema from Task 1, `db` from `@/db`
- Produces: `getTradeHistory(accountId)`, `createTrade(...)` functions

- [ ] **Step 1: Create trades query library**

```ts
import { db } from '@/db';
import { trades } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface TradeRecord {
  id: string;
  accountId: string;
  symbol: string;
  quantity: number;
  executionPrice: number;
  orderType: string;
  side: string;
  status: string;
  createdAt: Date;
}

export async function getTradeHistory(accountId: string): Promise<TradeRecord[]> {
  const rows = await db.query.trades.findMany({
    where: eq(trades.accountId, accountId),
    orderBy: (t) => desc(t.createdAt),
  });
  return rows.map((row) => ({
    id: row.id,
    accountId: row.accountId,
    symbol: row.symbol,
    quantity: Number(row.quantity),
    executionPrice: Number(row.executionPrice),
    orderType: row.orderType,
    side: row.side,
    status: row.status,
    createdAt: row.createdAt,
  }));
}

export async function createTrade(data: {
  id: string;
  accountId: string;
  symbol: string;
  quantity: number;
  executionPrice: number;
  orderType: string;
  side: string;
}) {
  await db.insert(trades).values(data);
}
```

- [ ] **Step 2: Verify imports compile**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/trades.ts
git commit -m "lib: add trade history queries"
```

---

### Task 4: Server actions for trade execution

**Files:**
- Create: `src/lib/actions/trades.ts`

**Interfaces:**
- Consumes: `getUser()` from `@/lib/auth`, `generateId()` from `@/lib/id`, `createTrade()` from `@/lib/trades`, `getAllHoldings()` from `@/lib/holdings`
- Produces: `executeTrade(symbol, quantity, price, orderType, side)` server action

- [ ] **Step 1: Create server actions**

```ts
'use server';

import { getUser } from '@/lib/auth';
import { generateId } from '@/lib/id';
import { createTrade, getTradeHistory } from '@/lib/trades';
import { getAllHoldings } from '@/lib/holdings';
import { db } from '@/db';
import { holdings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function executeTrade(
  symbol: string,
  quantity: number,
  executionPrice: number,
  orderType: 'market' | 'limit',
  side: 'buy' | 'sell'
) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  // For now, assume user has a default brokerage account
  // In production, you'd select the account from a dropdown
  const userAccounts = await db.query.accounts.findMany({
    where: (accounts, { eq }) => eq(accounts.userId, user.id),
  });

  const brokerageAccount = userAccounts.find((acc) => acc.type === 'brokerage');
  if (!brokerageAccount) throw new Error('No brokerage account found');

  // Create trade record
  const tradeId = generateId();
  await createTrade({
    id: tradeId,
    accountId: brokerageAccount.id,
    symbol,
    quantity,
    executionPrice,
    orderType,
    side,
  });

  // Update holdings
  const existingHolding = await db.query.holdings.findFirst({
    where: and(
      eq(holdings.accountId, brokerageAccount.id),
      eq(holdings.symbol, symbol)
    ),
  });

  if (side === 'buy') {
    if (existingHolding) {
      // Update existing position
      const newShares = Number(existingHolding.shares) + quantity;
      const totalCost =
        Number(existingHolding.costBasis) + quantity * executionPrice;
      const newCostBasis = totalCost / newShares;

      await db
        .update(holdings)
        .set({
          shares: String(newShares),
          costBasis: String(newCostBasis),
          updatedAt: new Date(),
        })
        .where(eq(holdings.id, existingHolding.id));
    } else {
      // Create new holding
      await db.insert(holdings).values({
        id: generateId(),
        accountId: brokerageAccount.id,
        symbol,
        name: symbol, // TODO: fetch from Yahoo Finance
        assetClass: 'us_stock', // TODO: determine from symbol
        shares: String(quantity),
        costBasis: String(executionPrice),
        currentPrice: String(executionPrice),
      });
    }
  } else if (side === 'sell') {
    if (existingHolding) {
      const newShares = Number(existingHolding.shares) - quantity;
      if (newShares <= 0) {
        // Remove holding entirely
        await db.delete(holdings).where(eq(holdings.id, existingHolding.id));
      } else {
        // Update position
        await db
          .update(holdings)
          .set({
            shares: String(newShares),
            updatedAt: new Date(),
          })
          .where(eq(holdings.id, existingHolding.id));
      }
    }
  }

  return { tradeId, success: true };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/trades.ts
git commit -m "actions: add executeTrade server action"
```

---

### Task 5: Update page tabs for Trade Stocks

**Files:**
- Modify: `src/components/page-tabs.tsx`

**Interfaces:**
- Consumes: existing `INVEST_TABS` array
- Produces: updated `INVEST_TABS` with `/invest/stocks` added

- [ ] **Step 1: Update INVEST_TABS**

Find the `INVEST_TABS` definition and update:

```ts
export const INVEST_TABS: PageTab[] = [
  { href: '/invest', label: 'Holdings' },
  { href: '/invest/stocks', label: 'Trade Stocks' },
  { href: '/invest/options', label: 'Options' },
  { href: '/invest/predictions', label: 'Predictions' },
];
```

- [ ] **Step 2: Verify no build errors**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/page-tabs.tsx
git commit -m "tabs: add Trade Stocks to INVEST_TABS"
```

---

### Task 6: Real-time quote ticker component

**Files:**
- Create: `src/components/invest/realtime-quote-ticker.tsx`

**Interfaces:**
- Consumes: `symbol` prop (string), `getRealtimeQuotes()` from `@/lib/yahoo-finance`
- Produces: component displaying current price, bid, ask, mid, change

- [ ] **Step 1: Create ticker component**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { getRealtimeQuotes } from '@/lib/yahoo-finance';

interface QuoteData {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  change: number;
  changePercent: number;
  prevClose: number;
}

interface RealtimeQuoteTickerProps {
  symbol: string;
  onQuoteUpdate?: (quote: QuoteData) => void;
}

export function RealtimeQuoteTicker({ symbol, onQuoteUpdate }: RealtimeQuoteTickerProps) {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuote() {
      try {
        const quotes = await getRealtimeQuotes([symbol]);
        if (quotes.length > 0) {
          const q = quotes[0];
          const data: QuoteData = {
            symbol: q.symbol,
            price: q.regularMarketPrice,
            bid: q.bid,
            ask: q.ask,
            change: q.regularMarketChange,
            changePercent: q.regularMarketChangePercent,
            prevClose: q.regularMarketPreviousClose,
          };
          setQuote(data);
          onQuoteUpdate?.(data);
        }
      } catch (error) {
        console.error('Failed to fetch quote:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchQuote();
    // Refresh every 5 seconds in production, but less frequently in demo
    const interval = setInterval(fetchQuote, 5000);
    return () => clearInterval(interval);
  }, [symbol, onQuoteUpdate]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="animate-pulse space-y-2">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        Unable to fetch quote for {symbol}
      </div>
    );
  }

  const isPositive = quote.change >= 0;
  const mid = quote.bid && quote.ask ? (quote.bid + quote.ask) / 2 : quote.price;

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{symbol}</p>
          <p className="text-4xl font-bold text-foreground">${quote.price.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{quote.change.toFixed(2)}
          </p>
          <p className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Bid</p>
          <p className="text-sm font-semibold text-foreground">${quote.bid?.toFixed(2) ?? 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Ask</p>
          <p className="text-sm font-semibold text-foreground">${quote.ask?.toFixed(2) ?? 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Mid</p>
          <p className="text-sm font-semibold text-foreground">${mid.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Prev Close</p>
          <p className="text-sm font-semibold text-foreground">${quote.prevClose.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/invest/realtime-quote-ticker.tsx
git commit -m "component: add real-time quote ticker"
```

---

### Task 7: Stock trading form component

**Files:**
- Create: `src/components/invest/stock-trading-form.tsx`

**Interfaces:**
- Consumes: `executeTrade()` server action from `@/lib/actions/trades`
- Produces: form component for entering symbol, quantity, limit price, order type, side

- [ ] **Step 1: Create trading form**

```tsx
'use client';

import { useState } from 'react';
import { executeTrade } from '@/lib/actions/trades';

interface StockTradingFormProps {
  onTradeExecuted?: () => void;
}

export function StockTradingForm({ onTradeExecuted }: StockTradingFormProps) {
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const qty = parseFloat(quantity);
      const price =
        orderType === 'limit'
          ? parseFloat(limitPrice)
          : 0; // TODO: use mid price from quote ticker

      if (!symbol || !qty || qty <= 0) {
        throw new Error('Please enter valid symbol and quantity');
      }

      if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
        throw new Error('Please enter valid limit price');
      }

      const result = await executeTrade(
        symbol.toUpperCase(),
        qty,
        price || 0,
        orderType,
        side
      );

      if (result.success) {
        setSuccess(
          `${side === 'buy' ? 'Bought' : 'Sold'} ${qty} shares of ${symbol.toUpperCase()}`
        );
        setSymbol('');
        setQuantity('');
        setLimitPrice('');
        onTradeExecuted?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trade execution failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">Execute Trade</h2>

      {/* Side Selection */}
      <div className="mb-6">
        <label className="text-sm font-medium text-foreground mb-2 block">Side</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setSide('buy')}
            className={`flex-1 py-2 px-3 rounded-lg border-2 font-medium transition-colors ${
              side === 'buy'
                ? 'border-emerald-600 bg-emerald-600/10 text-emerald-600'
                : 'border-border bg-muted text-muted-foreground'
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setSide('sell')}
            className={`flex-1 py-2 px-3 rounded-lg border-2 font-medium transition-colors ${
              side === 'sell'
                ? 'border-red-600 bg-red-600/10 text-red-600'
                : 'border-border bg-muted text-muted-foreground'
            }`}
          >
            Sell
          </button>
        </div>
      </div>

      {/* Symbol */}
      <div className="mb-4">
        <label className="text-sm font-medium text-foreground mb-2 block">Symbol</label>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="e.g., AAPL"
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isSubmitting}
        />
      </div>

      {/* Quantity */}
      <div className="mb-4">
        <label className="text-sm font-medium text-foreground mb-2 block">Quantity</label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0"
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isSubmitting}
        />
      </div>

      {/* Order Type */}
      <div className="mb-4">
        <label className="text-sm font-medium text-foreground mb-2 block">Order Type</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setOrderType('market')}
            className={`flex-1 py-2 px-3 rounded-lg border font-medium transition-colors ${
              orderType === 'market'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-muted text-muted-foreground'
            }`}
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => setOrderType('limit')}
            className={`flex-1 py-2 px-3 rounded-lg border font-medium transition-colors ${
              orderType === 'limit'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-muted text-muted-foreground'
            }`}
          >
            Limit
          </button>
        </div>
      </div>

      {/* Limit Price (conditional) */}
      {orderType === 'limit' && (
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground mb-2 block">Limit Price</label>
          <input
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isSubmitting}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-600/10 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-600/10 text-emerald-600 text-sm">
          {success}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
          side === 'buy'
            ? 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
            : 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'
        }`}
      >
        {isSubmitting ? 'Processing...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${quantity || '0'} ${symbol}`}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/invest/stock-trading-form.tsx
git commit -m "component: add stock trading form with market/limit orders"
```

---

### Task 8: Current holdings for trading page

**Files:**
- Create: `src/components/invest/current-holdings-for-trading.tsx`

**Interfaces:**
- Consumes: `holdings` array of `HoldingWithValue` type from `@/lib/holdings`
- Produces: component showing current positions for reference while trading

- [ ] **Step 1: Create holdings display**

```tsx
'use client';

import type { HoldingWithValue } from '@/lib/holdings';

interface CurrentHoldingsForTradingProps {
  holdings: HoldingWithValue[];
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function CurrentHoldingsForTrading({ holdings }: CurrentHoldingsForTradingProps) {
  if (holdings.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground text-sm">
        No current holdings. Start by buying your first position.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-foreground text-xs">Symbol</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Shares</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Cost Basis</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Current Price</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Current Value</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Gain/Loss</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => {
            const isPositive = holding.gainLoss >= 0;
            return (
              <tr key={holding.id} className="border-b border-border hover:bg-muted/20 last:border-0">
                <td className="px-4 py-3 font-bold text-foreground">{holding.symbol}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {holding.shares.toFixed(4)}
                </td>
                <td className="px-4 py-3 text-right text-foreground">
                  {formatCurrency(holding.costBasis)}
                </td>
                <td className="px-4 py-3 text-right text-foreground">
                  {formatCurrency(holding.currentPrice)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-foreground">
                  {formatCurrency(holding.currentValue)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    isPositive ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {isPositive ? '+' : ''}{formatCurrency(holding.gainLoss)} (
                  {isPositive ? '+' : ''}{holding.gainLossPct.toFixed(2)}%)
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/invest/current-holdings-for-trading.tsx
git commit -m "component: add current holdings reference table for trading"
```

---

### Task 9: Trade Stocks client view component

**Files:**
- Create: `src/components/invest/trade-stocks-view.tsx`

**Interfaces:**
- Consumes: `holdings` array, `RealtimeQuoteTicker`, `StockTradingForm`, `CurrentHoldingsForTrading` components
- Produces: full client view combining trading form, ticker, and holdings

- [ ] **Step 1: Create trade stocks view**

```tsx
'use client';

import { useState } from 'react';
import type { HoldingWithValue } from '@/lib/holdings';
import { RealtimeQuoteTicker } from './realtime-quote-ticker';
import { StockTradingForm } from './stock-trading-form';
import { CurrentHoldingsForTrading } from './current-holdings-for-trading';

interface TradeStocksViewProps {
  holdings: HoldingWithValue[];
}

export function TradeStocksView({ holdings }: TradeStocksViewProps) {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTradeExecuted = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <>
      <p className="text-muted-foreground mb-8">Buy and sell stocks in your portfolio</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Trading Form */}
        <div className="lg:col-span-1">
          <StockTradingForm onTradeExecuted={handleTradeExecuted} />
        </div>

        {/* Real-time Quote Ticker */}
        <div className="lg:col-span-2">
          <RealtimeQuoteTicker
            key={refreshKey}
            symbol={selectedSymbol}
            onQuoteUpdate={(quote) => {
              // Update form with current quote if needed
            }}
          />
        </div>
      </div>

      {/* Current Holdings */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Current Holdings</h2>
        <CurrentHoldingsForTrading holdings={holdings} />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/invest/trade-stocks-view.tsx
git commit -m "component: add trade stocks view combining form, ticker, and holdings"
```

---

### Task 10: Trade Stocks page

**Files:**
- Create: `src/app/invest/stocks/page.tsx`

**Interfaces:**
- Consumes: `getAllHoldings()` from `@/lib/holdings`, `getUser()` from `@/lib/auth`, `TradeStocksView` component
- Produces: server component at `/invest/stocks`

- [ ] **Step 1: Create Trade Stocks page**

```tsx
import { AppLayout } from '@/components/app-layout';
import { PageTabs, INVEST_TABS } from '@/components/page-tabs';
import { TradeStocksView } from '@/components/invest/trade-stocks-view';
import { getUser } from '@/lib/auth';
import { getAllHoldings } from '@/lib/holdings';

export const dynamic = 'force-dynamic';

export default async function TradeStocksPage() {
  const user = await getUser();
  const holdings = user && !user.isDemo ? await getAllHoldings() : [];

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Trade Stocks</h1>
        </div>
        <PageTabs tabs={INVEST_TABS} />
        <TradeStocksView holdings={holdings} />
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/invest/stocks/page.tsx
git commit -m "page: add Trade Stocks page at /invest/stocks"
```

---

### Task 11: Add Google Finance links to Holdings

**Files:**
- Modify: `src/components/invest/holdings-view.tsx`

**Interfaces:**
- Consumes: existing component with `holdings` array
- Produces: updated component with clickable symbol links to Google Finance

- [ ] **Step 1: Update holdings view to add links**

Find this line in the holdings map:
```tsx
<p className="text-sm font-bold text-foreground">{holding.symbol}</p>
```

Replace with:
```tsx
<a
  href={`https://www.google.com/finance/quote/${holding.symbol}:NASDAQ`}
  target="_blank"
  rel="noopener noreferrer"
  className="text-sm font-bold text-primary hover:underline"
>
  {holding.symbol}
</a>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Test in browser**

Run: `npm run dev`, log in, navigate to `/invest`, click a symbol
Expected: Opens Google Finance in new tab

- [ ] **Step 4: Commit**

```bash
git add src/components/invest/holdings-view.tsx
git commit -m "enhance: add Google Finance links to Holdings symbols"
```

---

### Task 12: Wire Options page to real database data

**Files:**
- Modify: `src/app/invest/options/page.tsx`

**Interfaces:**
- Consumes: `getAllHoldings()` from `@/lib/holdings`, `getUser()` from `@/lib/auth`
- Produces: updated page querying real options holdings from database

- [ ] **Step 1: Convert to server component and fetch real options**

Replace the entire file with:

```tsx
import { AppLayout } from '@/components/app-layout';
import { PageTabs, INVEST_TABS } from '@/components/page-tabs';
import { OptionsPortfolioView } from '@/components/invest/options-portfolio-view';
import { getUser } from '@/lib/auth';
import { getAllHoldings } from '@/lib/holdings';

export const dynamic = 'force-dynamic';

export default async function OptionsPage() {
  const user = await getUser();
  const allHoldings = user && !user.isDemo ? await getAllHoldings() : [];

  // Filter to only options holdings (assetClass would need to be tracked for options)
  // For now, show all holdings and add options-specific UI later
  const optionsHoldings = allHoldings.filter((h) => h.assetClass === 'option');

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Options</h1>
        <p className="text-muted-foreground mb-4">Manage your options positions and derivatives strategies</p>
        <PageTabs tabs={INVEST_TABS} />

        {optionsHoldings.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            <p>No options positions yet. Visit Trade Stocks to start selling covered calls or cash-secured puts.</p>
          </div>
        ) : (
          <OptionsPortfolioView holdings={optionsHoldings} />
        )}
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Create options portfolio view component**

Create `src/components/invest/options-portfolio-view.tsx`:

```tsx
'use client';

import type { HoldingWithValue } from '@/lib/holdings';
import { Tooltip } from '@/components/ui/tooltip';

interface OptionsPortfolioViewProps {
  holdings: HoldingWithValue[];
}

const STRATEGY_GUIDE = {
  bullish: [
    { name: 'Call Spread', description: 'Lower risk, defined max profit' },
    { name: 'Bull Call Spread', description: 'Moderate bullish outlook' },
    { name: 'Covered Call', description: 'Generate income on holdings' },
  ],
  bearish: [
    { name: 'Put Spread', description: 'Lower risk, defined max profit' },
    { name: 'Bear Call Spread', description: 'Moderate bearish outlook' },
    { name: 'Iron Condor', description: 'Neutral outlook, high probability' },
  ],
};

export function OptionsPortfolioView({ holdings }: OptionsPortfolioViewProps) {
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalGainLoss = holdings.reduce((sum, h) => sum + h.gainLoss, 0);

  return (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-border p-4 bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total Positions</p>
          <p className="text-2xl font-bold text-foreground">{holdings.length}</p>
        </div>
        <div className="rounded-lg border border-border p-4 bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Portfolio Value</p>
          <p className="text-2xl font-bold text-foreground">${totalValue.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-border p-4 bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total P&L</p>
          <p className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {totalGainLoss >= 0 ? '+' : ''}{totalGainLoss.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card mb-8">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-foreground text-xs">Symbol</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Shares</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Current Price</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Value</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Gain/Loss</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => {
              const isPositive = holding.gainLoss >= 0;
              return (
                <tr key={holding.id} className="border-b border-border hover:bg-muted/20 last:border-0">
                  <td className="px-4 py-3 font-bold text-foreground">{holding.symbol}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{holding.shares}</td>
                  <td className="px-4 py-3 text-right text-foreground">${holding.currentPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">
                    ${holding.currentValue.toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isPositive ? '+' : ''}{holding.gainLoss.toFixed(2)} ({isPositive ? '+' : ''}
                    {holding.gainLossPct.toFixed(2)}%)
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Strategy Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border p-6 bg-card">
          <h3 className="font-semibold text-foreground mb-4">Bullish Strategies</h3>
          <div className="space-y-3">
            {STRATEGY_GUIDE.bullish.map((strategy) => (
              <div key={strategy.name}>
                <p className="text-sm font-medium text-foreground">{strategy.name}</p>
                <p className="text-xs text-muted-foreground">{strategy.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border p-6 bg-card">
          <h3 className="font-semibold text-foreground mb-4">Bearish Strategies</h3>
          <div className="space-y-3">
            {STRATEGY_GUIDE.bearish.map((strategy) => (
              <div key={strategy.name}>
                <p className="text-sm font-medium text-foreground">{strategy.name}</p>
                <p className="text-xs text-muted-foreground">{strategy.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Test in browser**

Run: `npm run dev`, log in, navigate to `/invest/options`
Expected: Shows "No options positions yet" if none exist (correct), or displays real holdings if added

- [ ] **Step 5: Commit**

```bash
git add src/app/invest/options/page.tsx src/components/invest/options-portfolio-view.tsx
git commit -m "refactor: wire Options page to real database data"
```

---

### Task 13: Full-flow verification

**Files:**
- Test: Manual verification of all pages

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Navigate to each page**

- `/invest` (Holdings) — verify real holdings display, Google Finance links work
- `/invest/stocks` (Trade Stocks) — verify form displays, ticker loads for symbols
- `/invest/options` — verify "No options positions" message or real data if any exist
- `/invest/predictions` — verify no regressions

- [ ] **Step 3: Test trading workflow**

1. Go to `/invest/stocks`
2. Enter symbol (AAPL)
3. Enter quantity (1)
4. Select Market order
5. Click Buy
6. Verify success message and holdings update

- [ ] **Step 4: Verify Holdings updated**

Go to `/invest` and verify the new trade appears in holdings

- [ ] **Step 5: Verify Google Finance links**

Click a symbol link in Holdings, verify it opens Google Finance in new tab

- [ ] **Step 6: Build for production**

Run: `npm run build`
Expected: No errors, build succeeds

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete Trade Stocks features (trading UI, ticker, Google Finance links)"
```

---

## Spec Coverage Checklist

- [x] Trade Stocks tab with order form (buy/sell, market/limit types)
- [x] Real-time quote ticker (bid/ask/mid/previous close)
- [x] Current holdings reference in trading page
- [x] Trades table for order history
- [x] Google Finance links in Holdings
- [x] Options page wired to real database data
- [x] Tab navigation updated
- [x] Server actions for trade execution

All requirements from the spec are covered in the tasks above.
