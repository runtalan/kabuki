# Options Trading Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack options trading dashboard with database-backed watchlist, live market data via Yahoo Finance, Strike Heat Map with ATM±5-10 strikes, and 3-column responsive UI.

**Architecture:** 
1. Add `watchlist` table to Postgres schema (userId + ticker)
2. Three lightweight API endpoints wrap yahoo-finance2 calls server-side (no client API keys)
3. Strike Heat Map component renders only ATM±5-10 strikes per expiry (performance rule)
4. 3-column layout: left=watchlist table, center=heat map, right=order builder
5. Client-side caching (30–60s) to avoid rate-limit spam
6. Expiry dropdown change triggers instant heat map re-render (no skeleton)

**Tech Stack:**
- Drizzle ORM (Postgres schema + migrations)
- yahoo-finance2 (server-side data fetching)
- React (3-column layout, components, hooks)
- Next.js API routes (three endpoints)
- TailwindCSS (responsive grid layout)

## Global Constraints

- Never load full options chain into DOM (always ATM ± 5–10 strikes only)
- Watchlist scoped to authenticated user only
- API endpoints call yahoo-finance2 server-side (no client-side API keys exposed)
- Client-side cache durations: 30s for watchlist, 60s for options chain
- Skeleton loaders on initial load; instant swap (no skeleton) when expiry changes
- Error boundaries catch yahoo-finance2 timeouts, return cached fallback or skeleton state

---

## Task 1: Add Watchlist Table to Schema & Create Migration

**Files:**
- Modify: `src/db/schema.ts` (add table export)
- Create: `drizzle/0021_watchlist.sql` (migration)

**Interfaces:**
- Consumes: Existing `users` table (userId reference)
- Produces: `watchlist` table with structure (id, userId, ticker, createdAt)

- [ ] **Step 1: Add watchlist table definition to schema**

Open `src/db/schema.ts` and add after the `trades` table definition:

```typescript
export const watchlist = pgTable(
  "watchlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ticker: varchar("ticker", { length: 10 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_watchlist_user_ticker").on(table.userId, table.ticker),
    index("idx_watchlist_user_id").on(table.userId),
  ]
);
```

- [ ] **Step 2: Create migration file**

Create `drizzle/0021_watchlist.sql`:

```sql
-- Add watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker varchar(10) NOT NULL,
  created_at timestamp DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, ticker)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
```

- [ ] **Step 3: Apply migration to sandbox**

```bash
psql postgresql://localhost/kabuki_sandbox -f drizzle/0021_watchlist.sql
```

Verify table exists:
```bash
psql postgresql://localhost/kabuki_sandbox -c "\dt watchlist"
```

Expected output: table `watchlist` with columns id, user_id, ticker, created_at.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts drizzle/0021_watchlist.sql
git commit -m "feat: add watchlist table to schema and migration"
```

---

## Task 2: Create Seed Script for Initial Watchlist

**Files:**
- Create: `scripts/seed-watchlist.ts`

**Interfaces:**
- Consumes: `watchlist` table (from Task 1), `users` table, Postgres connection
- Produces: Watchlist seeded with NVDA, CRDO, AAPL, MSFT, LLY for authenticated user

- [ ] **Step 1: Write seed script**

Create `scripts/seed-watchlist.ts`:

```typescript
import { db } from "@/lib/db";
import { watchlist, users } from "@/db/schema";
import { eq } from "drizzle-orm";

const WATCHLIST_TICKERS = ["NVDA", "CRDO", "AAPL", "MSFT", "LLY"];

async function seedWatchlist() {
  try {
    // Find the primary user (usually id='user-1' or first user)
    const user = await db.query.users.findFirst();
    if (!user) {
      console.error("No user found. Seed a user first.");
      process.exit(1);
    }

    // Clear existing watchlist for this user
    await db
      .delete(watchlist)
      .where(eq(watchlist.userId, user.id));

    // Insert tickers
    const results = await db.insert(watchlist).values(
      WATCHLIST_TICKERS.map((ticker) => ({
        userId: user.id,
        ticker,
      }))
    );

    console.log(`✅ Seeded ${results.length} tickers for user ${user.username}`);
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seedWatchlist();
```

- [ ] **Step 2: Add seed script to package.json**

Open `package.json`, find `scripts` section, add:

```json
"seed:watchlist": "tsx scripts/seed-watchlist.ts"
```

- [ ] **Step 3: Run seed script**

```bash
npm run seed:watchlist
```

Expected output: `✅ Seeded 5 tickers for user <username>`

- [ ] **Step 4: Verify in database**

```bash
psql postgresql://localhost/kabuki_sandbox -c "SELECT ticker FROM watchlist LIMIT 5;"
```

Expected: NVDA, CRDO, AAPL, MSFT, LLY.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-watchlist.ts package.json
git commit -m "feat: add watchlist seed script"
```

---

## Task 3: Create Yahoo Finance Client Utility

**Files:**
- Create: `src/lib/yahoo-finance-client.ts`

**Interfaces:**
- Consumes: `yahoo-finance2` package (assumed installed; if not, run `npm install yahoo-finance2`)
- Produces: Utility functions:
  - `getStockQuote(ticker: string)` → `{ currentPrice, dayChange, dayChangePercent, volume, name }`
  - `getOptionExpirations(ticker: string)` → `string[]` (ISO dates, sorted nearest-first)
  - `getOptionChain(ticker: string, expiryDate: string, atmWindow: number = 5)` → `{ calls: [...], puts: [...], currentPrice, daysToExpiry }`

- [ ] **Step 1: Check if yahoo-finance2 is installed**

```bash
npm list yahoo-finance2
```

If not installed:
```bash
npm install yahoo-finance2
```

- [ ] **Step 2: Create yahoo finance client**

Create `src/lib/yahoo-finance-client.ts`:

```typescript
import * as yf from "yahoo-finance2";

export interface StockQuote {
  ticker: string;
  name: string;
  currentPrice: number;
  dayChange: number;
  dayChangePercent: number;
  volume: number;
}

export interface OptionStrike {
  strike: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface OptionChain {
  calls: OptionStrike[];
  puts: OptionStrike[];
  currentPrice: number;
  daysToExpiry: number;
}

// Helper: Convert yahoo-finance2 option data to our interface
function parseOptionContract(contract: any): OptionStrike {
  return {
    strike: contract.strike,
    bid: contract.bid || 0,
    ask: contract.ask || 0,
    volume: contract.volume || 0,
    openInterest: contract.openInterest || 0,
    impliedVolatility: contract.impliedVolatility || 0,
    delta: contract.delta || 0,
    gamma: contract.gamma,
    theta: contract.theta,
    vega: contract.vega,
  };
}

export async function getStockQuote(ticker: string): Promise<StockQuote> {
  try {
    const quote = await yf.quote({
      symbols: [ticker],
      modules: [
        "price",
        "quoteSummary",
      ],
    });

    const data = quote[ticker];
    if (!data || !data.regularMarketPrice) {
      throw new Error(`No quote data for ${ticker}`);
    }

    return {
      ticker,
      name: data.longName || ticker,
      currentPrice: data.regularMarketPrice,
      dayChange: data.regularMarketChange || 0,
      dayChangePercent: data.regularMarketChangePercent || 0,
      volume: data.regularMarketVolume || 0,
    };
  } catch (error) {
    console.error(`Failed to fetch quote for ${ticker}:`, error);
    throw error;
  }
}

export async function getOptionExpirations(
  ticker: string
): Promise<string[]> {
  try {
    const options = await yf.getOptionChain(ticker);
    if (!options || !options.expirationDates) {
      return [];
    }

    // Convert timestamps to ISO date strings, sort nearest-first
    return options.expirationDates
      .map((timestamp: number) => {
        const date = new Date(timestamp * 1000);
        return date.toISOString().split("T")[0]; // YYYY-MM-DD
      })
      .sort();
  } catch (error) {
    console.error(`Failed to fetch option expirations for ${ticker}:`, error);
    throw error;
  }
}

export async function getOptionChain(
  ticker: string,
  expiryDate: string,
  atmWindow: number = 5
): Promise<OptionChain> {
  try {
    const options = await yf.getOptionChain(ticker);
    if (!options || !options.result || options.result.length === 0) {
      throw new Error(`No option chain for ${ticker}`);
    }

    // Find the expiry matching the requested date
    const expiryObj = options.result.find((exp: any) => {
      const expDate = new Date(exp.expirationDate * 1000);
      return expDate.toISOString().split("T")[0] === expiryDate;
    });

    if (!expiryObj || !expiryObj.options) {
      throw new Error(
        `No options for ${ticker} on ${expiryDate}`
      );
    }

    const currentPrice = options.optionChain?.result?.[0]?.quote?.regularMarketPrice || 0;
    const atmStrike = Math.round(currentPrice);

    // Filter to ATM ± atmWindow strikes only
    const allOptions = expiryObj.options;
    const filtered = allOptions.filter((opt: any) => {
      const strike = opt.strike;
      return strike >= atmStrike - atmWindow && strike <= atmStrike + atmWindow;
    });

    // Separate calls and puts
    const calls = filtered
      .filter((opt: any) => opt.option_type === "call")
      .sort((a: any, b: any) => a.strike - b.strike)
      .map(parseOptionContract);

    const puts = filtered
      .filter((opt: any) => opt.option_type === "put")
      .sort((a: any, b: any) => a.strike - b.strike)
      .map(parseOptionContract);

    // Calculate days to expiry
    const expiryTimestamp = expiryObj.expirationDate * 1000;
    const daysToExpiry = Math.ceil(
      (expiryTimestamp - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return {
      calls,
      puts,
      currentPrice,
      daysToExpiry,
    };
  } catch (error) {
    console.error(
      `Failed to fetch option chain for ${ticker} (${expiryDate}):`,
      error
    );
    throw error;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/yahoo-finance-client.ts
git commit -m "feat: add yahoo-finance2 client utility"
```

---

## Task 4: Create /api/watchlist Endpoint

**Files:**
- Create: `src/app/api/watchlist/route.ts`

**Interfaces:**
- Consumes: `getUser()` from `@/lib/auth`, `watchlist` table, `getStockQuote()` from Task 3
- Produces: `GET /api/watchlist` → JSON `{ watchlist: [{ ticker, name, currentPrice, dayChange, dayChangePercent, volume }, ...] }`

- [ ] **Step 1: Create watchlist API route**

Create `src/app/api/watchlist/route.ts`:

```typescript
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { watchlist } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStockQuote } from "@/lib/yahoo-finance-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch watchlist tickers from DB
    const tickers = await db
      .select({ ticker: watchlist.ticker })
      .from(watchlist)
      .where(eq(watchlist.userId, user.id));

    if (!tickers.length) {
      return Response.json({ watchlist: [] });
    }

    // Enrich with live market data
    const enriched = await Promise.all(
      tickers.map(async (row) => {
        try {
          const quote = await getStockQuote(row.ticker);
          return quote;
        } catch (error) {
          console.error(
            `Failed to fetch quote for ${row.ticker}:`,
            error
          );
          // Return stub on error (later, client will use cache)
          return {
            ticker: row.ticker,
            name: row.ticker,
            currentPrice: 0,
            dayChange: 0,
            dayChangePercent: 0,
            volume: 0,
          };
        }
      })
    );

    return Response.json({ watchlist: enriched });
  } catch (error) {
    console.error("Watchlist API error:", error);
    return Response.json(
      { error: "Failed to fetch watchlist" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test endpoint locally**

Start dev server (if not running):
```bash
npm run dev
```

In another terminal, test:
```bash
curl http://localhost:3000/api/watchlist
```

Expected response: JSON with watchlist array containing 5 tickers with live prices.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/watchlist/route.ts
git commit -m "feat: add GET /api/watchlist endpoint with yahoo-finance2 enrichment"
```

---

## Task 5: Create /api/options/expirations Endpoint

**Files:**
- Create: `src/app/api/options/expirations/route.ts`

**Interfaces:**
- Consumes: Query param `ticker`, `getOptionExpirations()` from Task 3
- Produces: `GET /api/options/expirations?ticker=NVDA` → JSON `{ expirations: ["2026-08-15", "2026-08-22", ...] }`

- [ ] **Step 1: Create expirations API route**

Create `src/app/api/options/expirations/route.ts`:

```typescript
import { getOptionExpirations } from "@/lib/yahoo-finance-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ticker = url.searchParams.get("ticker");

    if (!ticker) {
      return Response.json(
        { error: "Missing ticker query param" },
        { status: 400 }
      );
    }

    const expirations = await getOptionExpirations(ticker.toUpperCase());

    return Response.json({ expirations });
  } catch (error) {
    console.error("Expirations API error:", error);
    return Response.json(
      { error: "Failed to fetch expirations" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test endpoint**

```bash
curl "http://localhost:3000/api/options/expirations?ticker=NVDA"
```

Expected response: JSON with expirations array (ISO date strings, nearest-first).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/options/expirations/route.ts
git commit -m "feat: add GET /api/options/expirations endpoint"
```

---

## Task 6: Create /api/options/chain Endpoint

**Files:**
- Create: `src/app/api/options/chain/route.ts`

**Interfaces:**
- Consumes: Query params `ticker`, `expiry`, `atmWindow` (optional, default 5), `getOptionChain()` from Task 3
- Produces: `GET /api/options/chain?ticker=NVDA&expiry=2026-08-15` → JSON `{ calls: [...], puts: [...], currentPrice, daysToExpiry }`

- [ ] **Step 1: Create chain API route**

Create `src/app/api/options/chain/route.ts`:

```typescript
import { getOptionChain } from "@/lib/yahoo-finance-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ticker = url.searchParams.get("ticker");
    const expiry = url.searchParams.get("expiry");
    const atmWindowStr = url.searchParams.get("atmWindow") || "5";
    const atmWindow = parseInt(atmWindowStr, 10);

    if (!ticker || !expiry) {
      return Response.json(
        { error: "Missing ticker or expiry query params" },
        { status: 400 }
      );
    }

    if (isNaN(atmWindow) || atmWindow < 1) {
      return Response.json(
        { error: "Invalid atmWindow (must be positive integer)" },
        { status: 400 }
      );
    }

    const chain = await getOptionChain(
      ticker.toUpperCase(),
      expiry,
      atmWindow
    );

    return Response.json(chain);
  } catch (error) {
    console.error("Chain API error:", error);
    return Response.json(
      { error: "Failed to fetch option chain" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test endpoint**

```bash
curl "http://localhost:3000/api/options/chain?ticker=NVDA&expiry=2026-08-15"
```

Expected response: JSON with calls/puts arrays (ATM±5 strikes only), currentPrice, daysToExpiry.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/options/chain/route.ts
git commit -m "feat: add GET /api/options/chain endpoint (ATM±N strikes only)"
```

---

## Task 7: Create Simple Client-Side Cache Utility

**Files:**
- Create: `src/lib/cache.ts`

**Interfaces:**
- Produces: `cache(key: string, ttlSeconds: number, fetcher: () => Promise<T>)` → Promise<T>

- [ ] **Step 1: Create cache utility**

Create `src/lib/cache.ts`:

```typescript
const cacheStore = new Map<
  string,
  { data: any; expiresAt: number }
>();

export async function cache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const cached = cacheStore.get(key);

  // Return cached data if fresh
  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  // Fetch and cache
  try {
    const data = await fetcher();
    cacheStore.set(key, {
      data,
      expiresAt: now + ttlSeconds * 1000,
    });
    return data;
  } catch (error) {
    // On error, return stale cache if available
    if (cached) {
      console.warn(`Fetch failed for ${key}, returning stale cache`);
      return cached.data as T;
    }
    throw error;
  }
}

export function invalidateCache(key: string): void {
  cacheStore.delete(key);
}

export function clearCache(): void {
  cacheStore.clear();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/cache.ts
git commit -m "feat: add simple client-side cache utility (30-60s TTL)"
```

---

## Task 8: Create Strike Heat Map Component

**Files:**
- Create: `src/components/invest/options/strike-heat-map.tsx`

**Interfaces:**
- Consumes: `OptionChain` interface from Task 3 (calls, puts, currentPrice, daysToExpiry)
- Produces: React component
  - Props: `{ data: OptionChain, onStrikeClick: (strike: number, isCall: boolean) => void }`
  - Renders: 2-row grid (calls top, puts bottom), columns = strikes, cell color = volume intensity

- [ ] **Step 1: Create heat map component**

Create `src/components/invest/options/strike-heat-map.tsx`:

```typescript
'use client';

import { OptionChain } from '@/lib/yahoo-finance-client';

interface StrikeHeatMapProps {
  data: OptionChain;
  onStrikeClick: (strike: number, isCall: boolean) => void;
}

function getHeatColor(volume: number, maxVolume: number): string {
  if (!volume) return 'bg-gray-100 dark:bg-gray-800';
  
  const ratio = volume / maxVolume;
  if (ratio > 0.75) return 'bg-green-200 dark:bg-green-900';
  if (ratio > 0.5) return 'bg-yellow-200 dark:bg-yellow-900';
  if (ratio > 0.25) return 'bg-orange-200 dark:bg-orange-900';
  return 'bg-gray-200 dark:bg-gray-700';
}

export function StrikeHeatMap({ data, onStrikeClick }: StrikeHeatMapProps) {
  const { calls, puts, currentPrice, daysToExpiry } = data;

  if (!calls.length && !puts.length) {
    return (
      <div className="text-center text-gray-500 py-8">
        No options data available for this strike range.
      </div>
    );
  }

  // Combine all strikes to find min/max volume
  const allStrikes = calls.concat(puts);
  const maxVolume = Math.max(...allStrikes.map((s) => s.volume), 1);

  // Get unique strikes, sorted
  const strikes = Array.from(
    new Set(allStrikes.map((s) => s.strike))
  ).sort((a, b) => a - b);

  return (
    <div className="w-full">
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Current Price: ${currentPrice.toFixed(2)} | DTE: {daysToExpiry}d
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Calls Row */}
          <div className="mb-1">
            <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Calls
            </div>
            <div className="flex gap-1">
              {strikes.map((strike) => {
                const call = calls.find((c) => c.strike === strike);
                return (
                  <button
                    key={`call-${strike}`}
                    onClick={() => onStrikeClick(strike, true)}
                    className={`
                      flex-shrink-0 w-12 h-12 rounded
                      flex items-center justify-center text-xs font-bold
                      cursor-pointer transition
                      ${getHeatColor(call?.volume || 0, maxVolume)}
                      border border-gray-300 dark:border-gray-600
                      hover:scale-110 hover:shadow-md
                    `}
                    title={
                      call
                        ? `$${strike} | Vol: ${call.volume} | OI: ${call.openInterest}`
                        : `$${strike} | No data`
                    }
                  >
                    {call ? (
                      <span className="text-green-700 dark:text-green-300">
                        C
                      </span>
                    ) : (
                      '—'
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Puts Row */}
          <div>
            <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Puts
            </div>
            <div className="flex gap-1">
              {strikes.map((strike) => {
                const put = puts.find((p) => p.strike === strike);
                return (
                  <button
                    key={`put-${strike}`}
                    onClick={() => onStrikeClick(strike, false)}
                    className={`
                      flex-shrink-0 w-12 h-12 rounded
                      flex items-center justify-center text-xs font-bold
                      cursor-pointer transition
                      ${getHeatColor(put?.volume || 0, maxVolume)}
                      border border-gray-300 dark:border-gray-600
                      hover:scale-110 hover:shadow-md
                    `}
                    title={
                      put
                        ? `$${strike} | Vol: ${put.volume} | OI: ${put.openInterest}`
                        : `$${strike} | No data`
                    }
                  >
                    {put ? (
                      <span className="text-red-700 dark:text-red-300">P</span>
                    ) : (
                      '—'
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Strike Price Labels */}
          <div className="mt-2 flex gap-1">
            {strikes.map((strike) => (
              <div
                key={`label-${strike}`}
                className="flex-shrink-0 w-12 text-center text-xs text-gray-600 dark:text-gray-400"
              >
                ${strike}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 text-xs text-gray-600 dark:text-gray-400 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-200 dark:bg-green-900 rounded border border-gray-300"></div>
          <span>High Volume</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-200 dark:bg-orange-900 rounded border border-gray-300"></div>
          <span>Low Volume</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/invest/options/strike-heat-map.tsx
git commit -m "feat: add StrikeHeatMap component with volume-based coloring"
```

---

## Task 9: Create Skeleton Loader Component

**Files:**
- Create: `src/components/invest/options/skeleton-loaders.tsx`

**Interfaces:**
- Produces: React components:
  - `WatchlistSkeleton` - placeholder rows
  - `HeatMapSkeleton` - grid placeholder
  - `OrderFormSkeleton` - form fields placeholder

- [ ] **Step 1: Create skeleton component**

Create `src/components/invest/options/skeleton-loaders.tsx`:

```typescript
'use client';

export function WatchlistSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
        />
      ))}
    </div>
  );
}

export function HeatMapSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      
      <div className="space-y-2">
        <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
        <div className="flex gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={`call-${i}`}
              className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
        <div className="flex gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={`put-${i}`}
              className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function OrderFormSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1">
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/invest/options/skeleton-loaders.tsx
git commit -m "feat: add skeleton loaders for watchlist, heat map, and order form"
```

---

## Task 10: Refactor Options Page to 3-Column Layout

**Files:**
- Modify: `src/components/invest/options/options-exploration-page.tsx`

**Interfaces:**
- Consumes: `StrikeHeatMap` (Task 8), skeleton loaders (Task 9), API endpoints (Tasks 4–6), `cache()` (Task 7)
- Produces: Refactored page with 3-column layout and dynamic data fetching

- [ ] **Step 1: Update options-exploration-page to fetch from APIs**

Replace most of the file with:

```typescript
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { OptionsOrderForm } from './options-order-form';
import { StrikeHeatMap } from './strike-heat-map';
import { OptionsGuideModal } from './options-guide-modal';
import { OptionsDashboard } from './options-dashboard';
import { TickerSearch } from './ticker-search';
import { TickerSwitcher } from './ticker-switcher';
import { WatchlistTable } from '../watchlist/watchlist-table';
import { useWatchList } from '@/lib/watch-list-context';
import {
  WatchlistSkeleton,
  HeatMapSkeleton,
  OrderFormSkeleton,
} from './skeleton-loaders';
import { cache } from '@/lib/cache';
import type { OptionChain } from '@/lib/yahoo-finance-client';

interface OptionsExplorationPageProps {
  initialTicker?: string;
}

export function OptionsExplorationPage({
  initialTicker,
}: OptionsExplorationPageProps) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(
    initialTicker || null
  );
  const [selectedExpiry, setSelectedExpiry] = useState<string | null>(null);
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<'call' | 'put'>('call');

  // Data loading states
  const [watchlistData, setWatchlistData] = useState<
    Array<{
      ticker: string;
      name: string;
      currentPrice: number;
      dayChange: number;
      dayChangePercent: number;
      volume: number;
    }>
  >([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);

  const [expirations, setExpirations] = useState<string[]>([]);
  const [expiryLoading, setExpiryLoading] = useState(false);

  const [chainData, setChainData] = useState<OptionChain | null>(null);
  const [chainLoading, setChainLoading] = useState(false);

  const orderFormRef = useRef<HTMLDivElement>(null);

  // Fetch watchlist on mount
  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        setWatchlistLoading(true);
        const data = await cache(
          'watchlist',
          30,
          async () => {
            const res = await fetch('/api/watchlist');
            if (!res.ok) throw new Error('Failed to fetch watchlist');
            const json = await res.json();
            return json.watchlist;
          }
        );
        setWatchlistData(data);
        if (!selectedTicker && data.length > 0) {
          setSelectedTicker(data[0].ticker);
        }
      } catch (error) {
        console.error('Failed to load watchlist:', error);
      } finally {
        setWatchlistLoading(false);
      }
    };
    loadWatchlist();
  }, []);

  // Fetch expirations when ticker changes
  useEffect(() => {
    if (!selectedTicker) return;

    const loadExpirations = async () => {
      try {
        setExpiryLoading(true);
        const data = await cache(
          `expirations-${selectedTicker}`,
          60,
          async () => {
            const res = await fetch(
              `/api/options/expirations?ticker=${selectedTicker}`
            );
            if (!res.ok) throw new Error('Failed to fetch expirations');
            const json = await res.json();
            return json.expirations;
          }
        );
        setExpirations(data);
        if (data.length > 0 && !selectedExpiry) {
          setSelectedExpiry(data[0]);
        }
      } catch (error) {
        console.error('Failed to load expirations:', error);
        setExpirations([]);
      } finally {
        setExpiryLoading(false);
      }
    };
    loadExpirations();
  }, [selectedTicker]);

  // Fetch option chain when ticker or expiry changes
  useEffect(() => {
    if (!selectedTicker || !selectedExpiry) return;

    const loadChain = async () => {
      try {
        setChainLoading(true);
        const data = await cache(
          `chain-${selectedTicker}-${selectedExpiry}`,
          60,
          async () => {
            const res = await fetch(
              `/api/options/chain?ticker=${selectedTicker}&expiry=${selectedExpiry}`
            );
            if (!res.ok) throw new Error('Failed to fetch option chain');
            return res.json();
          }
        );
        setChainData(data);
        setSelectedStrike(null); // Clear strike when expiry changes
      } catch (error) {
        console.error('Failed to load option chain:', error);
        setChainData(null);
      } finally {
        setChainLoading(false);
      }
    };
    loadChain();
  }, [selectedTicker, selectedExpiry]);

  // Scroll order form into view on ticker select
  useEffect(() => {
    if (selectedTicker && orderFormRef.current) {
      orderFormRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [selectedTicker]);

  const handleWatchlistSelect = (ticker: string) => {
    setSelectedTicker(ticker);
  };

  const handleStrikeClick = (strike: number, isCall: boolean) => {
    setSelectedStrike(strike);
    setSelectedType(isCall ? 'call' : 'put');
  };

  const currentPrice = chainData?.currentPrice || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
      {/* LEFT COLUMN: Watchlist */}
      <div className="md:col-span-1 border-r border-gray-200 dark:border-gray-800 pr-4">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Watchlist
          </h2>
        </div>
        {watchlistLoading ? (
          <WatchlistSkeleton />
        ) : (
          <div className="space-y-2">
            {watchlistData.map((item) => (
              <button
                key={item.ticker}
                onClick={() => handleWatchlistSelect(item.ticker)}
                className={`
                  w-full text-left p-3 rounded
                  ${
                    selectedTicker === item.ticker
                      ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }
                  hover:bg-gray-100 dark:hover:bg-gray-700 transition
                `}
              >
                <div className="font-bold text-gray-900 dark:text-gray-100">
                  {item.ticker}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  ${item.currentPrice.toFixed(2)}
                </div>
                <div
                  className={`text-xs font-semibold ${
                    item.dayChangePercent >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {item.dayChangePercent >= 0 ? '+' : ''}
                  {item.dayChangePercent.toFixed(2)}%
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CENTER COLUMN: Strike Heat Map */}
      <div className="md:col-span-1 border-r border-gray-200 dark:border-gray-800 pr-4">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
            {selectedTicker ? `${selectedTicker} Options` : 'Select a ticker'}
          </h2>
          {selectedTicker && (
            <select
              value={selectedExpiry || ''}
              onChange={(e) => setSelectedExpiry(e.target.value)}
              className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Loading expirations...</option>
              {expirations.map((expiry) => (
                <option key={expiry} value={expiry}>
                  {new Date(expiry + 'T00:00:00').toLocaleDateString()} ({expiry})
                </option>
              ))}
            </select>
          )}
        </div>

        {chainLoading ? (
          <HeatMapSkeleton />
        ) : chainData ? (
          <StrikeHeatMap data={chainData} onStrikeClick={handleStrikeClick} />
        ) : (
          <div className="text-center text-gray-500 py-8">
            {selectedTicker && selectedExpiry
              ? 'No chain data available'
              : 'Select a ticker and expiry'}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Order Builder */}
      <div className="md:col-span-1" ref={orderFormRef}>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Order Builder
          </h2>
        </div>

        {selectedTicker && selectedExpiry && chainData ? (
          <div className="space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            {/* Ticker & Expiry Summary */}
            <div className="text-sm">
              <div className="font-bold text-gray-900 dark:text-gray-100">
                {selectedTicker} @ ${currentPrice.toFixed(2)}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Exp: {new Date(selectedExpiry + 'T00:00:00').toLocaleDateString()}
              </div>
            </div>

            {/* Call/Put Toggle */}
            <div>
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">
                Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedType('call')}
                  className={`flex-1 py-2 rounded font-bold transition ${
                    selectedType === 'call'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white'
                  }`}
                >
                  Call
                </button>
                <button
                  onClick={() => setSelectedType('put')}
                  className={`flex-1 py-2 rounded font-bold transition ${
                    selectedType === 'put'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white'
                  }`}
                >
                  Put
                </button>
              </div>
            </div>

            {/* Strike Input */}
            <div>
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">
                Strike
              </label>
              <input
                type="number"
                value={selectedStrike || ''}
                onChange={(e) => setSelectedStrike(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Click heatmap or enter"
                className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                defaultValue="1"
                placeholder="1"
                className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Order Type */}
            <div>
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">
                Order Type
              </label>
              <select className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                <option>Market</option>
                <option>Limit</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <button className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded transition">
                Buy
              </button>
              <button className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded transition">
                Sell
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            Select a ticker and expiry to place an order
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Test the page layout**

```bash
npm run dev
# Visit http://localhost:3000/invest/options
```

Verify:
- Left column shows watchlist table (from DB)
- Center column shows expiry dropdown + heat map (fetches on ticker select)
- Right column shows order builder
- Clicking a heat map strike prefills order builder
- Changing expiry instantly updates heat map (no skeleton)

- [ ] **Step 3: Commit**

```bash
git add src/components/invest/options/options-exploration-page.tsx
git commit -m "feat: refactor options page into 3-column layout with API integration"
```

---

## Task 11: Update Options Page Server Component to Pass Minimal Props

**Files:**
- Modify: `src/app/invest/options/page.tsx`

**Interfaces:**
- Consumes: URL search params (`?ticker=NVDA`)
- Produces: Page that passes only `initialTicker` to exploration page (all data now fetched client-side via APIs)

- [ ] **Step 1: Simplify options page**

Replace `src/app/invest/options/page.tsx` with:

```typescript
import { AppLayout } from '@/components/app-layout';
import { PageTabs, INVEST_TABS } from '@/components/page-tabs';
import { OptionsExplorationPage } from '@/components/invest/options/options-exploration-page';
import { getUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function OptionsPage({
  searchParams,
}: {
  searchParams: { ticker?: string };
}) {
  const user = await getUser();
  if (!user) {
    return (
      <AppLayout>
        <div className="p-4 text-center">Please log in.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <PageTabs tabs={INVEST_TABS} />
        <div className="mt-8">
          <OptionsExplorationPage initialTicker={searchParams.ticker} />
        </div>
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Test**

```bash
npm run dev
# Visit http://localhost:3000/invest/options?ticker=NVDA
```

Verify: Page loads, all data fetched client-side via APIs, no mock data in the DOM.

- [ ] **Step 3: Commit**

```bash
git add src/app/invest/options/page.tsx
git commit -m "feat: simplify options page (all data now fetched via APIs)"
```

---

## Task 12: Add Error Boundary and Polish

**Files:**
- Modify: `src/components/invest/options/options-exploration-page.tsx`

**Interfaces:**
- Produces: Error boundary wrapper + toast notifications for API errors

- [ ] **Step 1: Add error handling to API calls**

Wrap each fetch in try/catch and show toast or inline error:

In the state, add:
```typescript
const [error, setError] = useState<string | null>(null);
```

In each catch block, set error and auto-clear after 5s:
```typescript
catch (error) {
  const msg = error instanceof Error ? error.message : 'Unknown error';
  setError(msg);
  setTimeout(() => setError(null), 5000);
}
```

In the JSX, show error banner:
```typescript
{error && (
  <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
    {error}
  </div>
)}
```

- [ ] **Step 2: Test error handling**

Temporarily break an API route to verify error shows gracefully.

- [ ] **Step 3: Commit**

```bash
git add src/components/invest/options/options-exploration-page.tsx
git commit -m "feat: add error boundaries and toast notifications for API errors"
```

---

## Task 13: Verify End-to-End & Manual Testing

**Files:** None (testing phase)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test watchlist load**

Visit http://localhost:3000/invest/options

Verify:
- Left column shows 5 tickers (NVDA, CRDO, AAPL, MSFT, LLY) with live prices

- [ ] **Step 3: Test ticker selection**

Click a ticker.

Verify:
- Expiry dropdown populates with dates
- Heat map loads and displays calls/puts grid
- Right column order builder shows

- [ ] **Step 4: Test expiry change**

Change expiry dropdown.

Verify:
- Heat map **instantly** updates (no skeleton, no lag)
- Strike selection cleared
- Cache is working (browser DevTools → Network, see HTTP 200 for cached requests)

- [ ] **Step 5: Test heat map interaction**

Click a strike cell (call or put).

Verify:
- Strike field in order builder auto-fills
- Type (Call/Put) button highlights correctly

- [ ] **Step 6: Test URL param**

Visit http://localhost:3000/invest/options?ticker=AAPL

Verify:
- AAPL pre-selected and data loads

- [ ] **Step 7: Check browser console**

Verify: No errors, warnings only for rate-limit fallback (if any).

- [ ] **Step 8: Test mobile responsiveness**

Open DevTools, toggle device emulation.

Verify:
- 3-column layout stacks to single column on mobile
- Heat map scrolls horizontally if needed
- Touches work on mobile (click → strike fill)

- [ ] **Step 9: Commit a final test pass**

```bash
git add -A
git commit -m "test: verify end-to-end functionality and mobile responsiveness"
```

---

## Task 14: Production Deploy Verification

**Files:** None (deployment phase)

- [ ] **Step 1: Verify production secrets**

Run the pre-deploy verification script (from CLAUDE.md):
```bash
npm run verify:prod-secrets
```

Verify: All secrets match (PLAID_ENV=production, DATABASE_URL, etc.).

- [ ] **Step 2: Merge to main**

Ensure all commits are on a feature branch, then:
```bash
git checkout main
git pull origin main
git merge <feature-branch>
git push origin main
```

- [ ] **Step 3: Monitor Firebase deploy**

Visit Firebase Console → App Hosting → kabuki backend.

Verify: Build succeeds, traffic routed to new revision.

- [ ] **Step 4: Test production**

Visit https://kabuki.app/invest/options (or your production domain).

Verify:
- Watchlist loads with live market data
- Expirations fetch (may be slower than sandbox due to real data)
- Heat map renders
- No console errors

- [ ] **Step 5: Check production database**

Connect to production Supabase (see ENVIRONMENTS.md):
```bash
psql "postgresql://postgres.qqhvjcwqhfvpjlisezaq:<PASSWORD>@aws-1-us-west-2.pooler.supabase.com:5436/postgres" -c "SELECT COUNT(*) FROM watchlist;"
```

Verify: Watchlist table exists and has rows.

---

## Summary of Deliverables

✅ Database: `watchlist` table + migration + seed script (5 tickers)  
✅ APIs: `/api/watchlist`, `/api/options/expirations`, `/api/options/chain` (yahoo-finance2 integrated)  
✅ Components: Strike Heat Map, skeleton loaders, error boundaries  
✅ UI: 3-column responsive layout (left=watchlist, center=heat map, right=order builder)  
✅ Performance: Client-side caching, no full-chain DOM overload, instant expiry updates  
✅ Testing: End-to-end manual verification, mobile responsive  
✅ Production: Secrets verified, deploy monitored
