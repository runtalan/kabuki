# Options Trading Dashboard – Full Stack Design

**Date:** 2026-08-07  
**Scope:** Database seeding, Yahoo Finance integration, Strike Heat Map UI, page refactor  
**Status:** Design approved

---

## 1. Database Schema

### Watchlist Table

```sql
CREATE TABLE watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker varchar(10) NOT NULL,
  created_at timestamp DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, ticker),
  INDEX idx_watchlist_user_id (user_id)
);
```

**Seed Script:**
Populates sandbox and production with: NVDA, CRDO, AAPL, MSFT, LLY for the authenticated user.

**Rationale:**
- Minimal schema: only userId + ticker
- Unique constraint prevents duplicates
- Client sorts by price performance (no DB ordering complexity)
- Cascades on user delete (appropriate for single-user app)

---

## 2. API Layer

All endpoints call yahoo-finance2 server-side. Client never holds API keys.

### `GET /api/watchlist`

**Response:**
```json
{
  "watchlist": [
    {
      "ticker": "NVDA",
      "name": "NVIDIA Corporation",
      "currentPrice": 142.50,
      "dayChange": 2.30,
      "dayChangePercent": 1.64,
      "volume": 45000000
    }
  ]
}
```

**Behavior:**
- Returns user's watchlist tickers enriched with live market data from yahoo-finance2
- Client-side 30s cache to avoid rate-limit noise
- Fallback: return previously cached data on timeout

### `GET /api/options/expirations?ticker=NVDA`

**Response:**
```json
{
  "expirations": ["2026-08-15", "2026-08-22", "2026-09-05"]
}
```

**Behavior:**
- Fetches unique expiration dates for a ticker from yahoo-finance2
- Sorted nearest-first
- Client defaults to first (nearest) expiry

### `GET /api/options/chain?ticker=NVDA&expiry=2026-08-15`

**Response:**
```json
{
  "calls": [
    {
      "strike": 140.0,
      "bid": 2.45,
      "ask": 2.55,
      "volume": 12500,
      "openInterest": 89000,
      "impliedVolatility": 0.32,
      "delta": 0.65
    }
  ],
  "puts": [
    {
      "strike": 140.0,
      "bid": 1.20,
      "ask": 1.30,
      "volume": 8900,
      "openInterest": 65000,
      "impliedVolatility": 0.31,
      "delta": -0.35
    }
  ],
  "currentPrice": 142.50,
  "daysToExpiry": 8
}
```

**Behavior:**
- Fetches strikes **ATM ± 5–10 only** (not full chain)
- Calculates ATM window from currentPrice
- Never returns 100+ strikes—strict performance rule
- Includes Greeks (IV, delta) for trade context

**Error Handling:**
- Timeout (> 5s): return previous cached chain or skeleton state
- Rate limit: cache-hit first, then queue for retry
- Invalid ticker: 404 with clear message

---

## 3. UI Layout

### 3-Column Layout (responsive, stacks on mobile)

```
┌─────────────────────────────────────────────────────┐
│  Header: Options Trading Desk                       │
├──────────────┬──────────────────────┬───────────────┤
│   LEFT       │      CENTER          │     RIGHT     │
│              │                      │               │
│ Watchlist    │  Asset Overview      │ Order Builder │
│ Manager      │  ┌────────────────┐  │               │
│              │  │ Strike Heat Map│  │ Expiry: [DD]  │
│ • NVDA       │  │ Calls / Puts   │  │               │
│   $142.50    │  └────────────────┘  │ Strike: [___] │
│   +1.64%     │                      │               │
│              │  Click strike →      │ Call / Put    │
│ • AAPL       │  prefill order form  │ Qty: [____]   │
│   $234.10    │                      │               │
│   -0.23%     │                      │ [Buy] [Sell]  │
│              │                      │               │
└──────────────┴──────────────────────┴───────────────┘
```

### Left Column: Watchlist Manager
- Table with columns: Ticker, Name, Price, Day Change, Day Change %, Volume
- Rows clickable to select ticker
- Live price updates (polling every 5s during market hours, 1m after hours)
- Remove button per row (localStorage + DB sync)

### Center Column: Strike Heat Map
- Header: Selected ticker, current price, 52-week range, Greeks summary
- 2-row grid: Calls (top), Puts (bottom)
- Columns: Strike prices (ATM ± 5–10, sorted left→right)
- Cell color intensity: Volume/open-interest heatmap (green=high, yellow=medium, gray=low)
- Cell click: Extract strike, prefill order builder, fetch live bid/ask
- Re-renders instantly when expiry changes (no skeleton; fast swap)

### Right Column: Order Builder
- Expiry dropdown (fetched on ticker select, defaults nearest)
- Strike price input (auto-filled from heatmap click, manual editable)
- Call/Put toggle (radio or segmented control)
- Quantity input (number field, positive integer)
- Order type: Limit / Market (radio; expand bid/ask fields for limit)
- Buy/Sell buttons (primary CTA)
- Shows live bid/ask spread for selected strike

**Skeleton Loaders:**
- Watchlist table: pulse rows until `/api/watchlist` returns
- Strike heat map: skeleton grid until `/api/options/chain` returns
- Smooth transitions between expiry changes (no skeleton; instant swap)

---

## 4. Data Flow & Interactions

### On Page Load
1. Fetch `/api/watchlist` → render watchlist table with live prices
2. Auto-select first ticker (or from URL param `?ticker=NVDA`)
3. Fetch `/api/options/expirations?ticker=<selected>` → show expiry dropdown
4. Set expiry to nearest (index 0)
5. Fetch `/api/options/chain?ticker=<selected>&expiry=<nearest>` → render heat map

### On Ticker Selection
1. Fetch `/api/options/expirations?ticker=<new>`
2. Default expiry to nearest
3. Fetch `/api/options/chain?ticker=<new>&expiry=<nearest>`
4. Render heat map
5. Scroll center column into view (smooth)
6. Clear order builder (strike, bid/ask, Greeks)

### On Expiry Dropdown Change
1. Fetch `/api/options/chain?ticker=<same>&expiry=<new>`
2. Re-render heat map instantly (no skeleton)
3. Clear order builder (strike, bid/ask, Greeks)
4. Keep ticker selection

### On Heat Map Node (Strike) Click
1. Extract strike price from clicked cell
2. Auto-populate strike field in order builder
3. Extract bid/ask from clicked cell data
4. Show live bid/ask spread
5. Scroll order builder into view (smooth)

### Watchlist Updates
- Add/remove via WatchListContext (localStorage for now)
- Reflects instantly in left column
- Future: sync to DB via PATCH `/api/watchlist`

---

## 5. Performance Rules (CRITICAL)

1. **No full chain in DOM:** Never load 100+ strikes. Always ATM ± 5–10 only.
2. **Client-side caching:** 30s cache on `/api/watchlist`, 60s on `/api/options/chain` to avoid rate-limit spam.
3. **Debounce expiry changes:** No back-to-back requests if user clicks expiry dropdown rapidly.
4. **Heat map re-renders:** Only when expiry changes or new data arrives; no re-fetch on scroll/hover.
5. **Skeleton loaders:** Use for initial load; instant swap (no skeleton) for expiry changes.

---

## 6. Implementation Phases

All work is **single implementation plan** (full stack):

1. **Database** (migration + seed script)
2. **API endpoints** (/api/watchlist, /api/options/expirations, /api/options/chain)
3. **Strike Heat Map component** (visual + click handling)
4. **UI refactor** (3-column layout, watchlist table, order builder)
5. **Integration & polish** (caching, error boundaries, skeleton loaders)

---

## 7. Success Criteria

- [ ] Database seeds with 5 tickers
- [ ] `/api/watchlist` returns live prices via yahoo-finance2
- [ ] `/api/options/expirations` fetches unique dates
- [ ] `/api/options/chain` returns ATM ± 5–10 strikes (never full chain)
- [ ] Strike Heat Map renders and updates on expiry change
- [ ] Expiry dropdown change triggers instant heat map update
- [ ] Order builder auto-fills from heat map click
- [ ] 3-column layout is responsive (mobile-friendly)
- [ ] No UI lag during expiry changes or ticker selection
- [ ] Error boundaries catch yahoo-finance2 timeouts gracefully
- [ ] Skeleton loaders appear during async loads

---

## 8. Known Constraints & Decisions

- **Watchlist scoped to user:** Single-user household; all watchlists share one DB row per ticker
- **Yahoo Finance rate limits:** Cached client-side (30–60s) to avoid spam
- **Strike window (ATM ± 5–10):** Performance trade-off; users can manually enter any strike in order builder
- **No real order execution:** Order builder is UI only (no backend execution logic)
- **Expiry defaults to nearest:** UX convention; users can override via dropdown
