# Known Build Blockers

## API Route Broken Imports (Pre-existing)

**Status:** Documented 2026-08-06  
**Severity:** High (blocks `npm run build`)  
**Scope:** Technical debt — should be resolved in dedicated work item

### Affected Files
- `src/app/api/investments/holdings/route.ts` (line 4)
- `src/app/api/investments/orders/route.ts` (line 4)

### Issue
Both files import non-existent tables from `@/db/schema`:
- `optionHoldings` — referenced but table never created
- `tradingOrders` — referenced but table never created

The imports trigger TypeScript compilation errors:
```
Error: Export optionHoldings doesn't exist in target module
Error: Export tradingOrders doesn't exist in target module
```

### Root Cause
Introduced in commit `c045079` ("feat: add Yahoo Finance API integration for market data, options chains, and trading history") but the corresponding schema tables were never added to `src/db/schema.ts`.

### Resolution Needed
Before proceeding, determine:

1. **Schema Decision:** Should `optionHoldings` and `tradingOrders` tables be created per the API implementation, or should the API routes be removed/simplified?

2. **API Contract Impact:** If routes are removed/simplified, what consumers depend on these endpoints?
   - GET `/api/investments/orders` — returns order history
   - POST `/api/investments/orders` — executes trades and records order history

3. **Feature Parity:** The API intended to track order history separately from holdings. Is this still needed with the new `trades` table in Task 1 of the Trade Stocks implementation?

### Workaround
To bypass the build error during development, one of the following is needed:
- [ ] Create `optionHoldings` and `tradingOrders` tables in schema (planned scope?)
- [ ] Remove/comment out the broken imports and affected code
- [ ] Split the API handlers to only handle valid use cases (equity trades with holdings table)

**Note:** This is independent of Task 1 (trades table schema) and should be addressed separately to maintain clean commit history and clear responsibility boundaries.
