# Options Heatmap Grid (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive Options Heatmap Grid that visualizes strike prices, expirations, and metrics, then integrate it with the existing order form to allow users to select contracts and auto-populate the order builder.

**Architecture:** 
- Create a self-contained `OptionsHeatmap` component that accepts contract data, current price, and selection callbacks
- Component manages its own filter state (Call/Put, Mode, Time Range, Moneyness, Yield)
- Parent page component (`OptionsExplorationPage`) toggles heatmap visibility and wires selected contract data to the order form
- Grid cells color-code by annualized yield: yellow (30-60%), green (<30%), pink (>60%)

**Tech Stack:** 
- React 18+ with TypeScript, Tailwind CSS for styling, Lucide React for icons
- No external charting libraries; grid built with CSS Grid and semantic HTML

## Global Constraints

- TypeScript strict mode: all types fully specified
- Dark mode support via Tailwind `dark:` classes
- Accessible: proper ARIA labels, keyboard navigation support
- No external dependencies beyond existing stack (React, Tailwind, Lucide)
- Mobile responsive with horizontal scroll for wide grids
- Follow existing design patterns from Phase 1 & 2 (input styling, color palette, spacing)

---

## File Structure

```
src/components/invest/options/
├── options-heatmap.tsx                 (CREATE)
├── options-exploration-page.tsx        (UPDATE)
├── options-order-form.tsx              (UPDATE - receive pre-filled data)
├── options-guide-modal.tsx             (no changes)
├── options-contracts-table.tsx         (no changes)
└── holdings-table.tsx                  (no changes)

src/lib/
└── options-types.ts                    (UPDATE - add heatmap-specific types)
```

---

## Task 1: Extend Type Definitions

**Files:**
- Modify: `src/lib/options-types.ts`

**Interfaces to Add:**
```typescript
export type MetricMode = 'premium' | 'ari' | 'delta';
export type MoneynessCategoryFilter = 'all' | 'itm' | 'atm' | 'otm';

export interface HeatmapFilterState {
  optionType: 'call' | 'put' | 'both';
  metricMode: MetricMode;
  timeRange?: {
    minDTE: number;
    maxDTE: number;
  };
  moneynessFilter: MoneynessCategoryFilter;
  yieldFilter?: {
    min: number;
    max: number;
  };
}

export interface HeatmapCellData {
  strike: number;
  expiry: Date;
  metricValue: number;         // Active mode metric (premium, delta, or ARI)
  totalPremium: number;
  dailyYield: number;
  annualizedYield: number;
  callContracts: OptionContract[];
  putContracts: OptionContract[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface OptionsHeatmapProps {
  ticker: string;
  currentPrice: number;
  contracts: OptionContract[];
  onSelectContract: (contract: OptionContract, strike: number, expiry: Date) => void;
  openGuideModal?: () => void;
}
```

- [ ] **Step 1: Open `src/lib/options-types.ts` and add the types above**

```typescript
// Add these type definitions at the end of the file
export type MetricMode = 'premium' | 'ari' | 'delta';
export type MoneynessCategoryFilter = 'all' | 'itm' | 'atm' | 'otm';

export interface HeatmapFilterState {
  optionType: 'call' | 'put' | 'both';
  metricMode: MetricMode;
  timeRange?: {
    minDTE: number;
    maxDTE: number;
  };
  moneynessFilter: MoneynessCategoryFilter;
  yieldFilter?: {
    min: number;
    max: number;
  };
}

export interface HeatmapCellData {
  strike: number;
  expiry: Date;
  metricValue: number;
  totalPremium: number;
  dailyYield: number;
  annualizedYield: number;
  callContracts: OptionContract[];
  putContracts: OptionContract[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface OptionsHeatmapProps {
  ticker: string;
  currentPrice: number;
  contracts: OptionContract[];
  onSelectContract: (contract: OptionContract, strike: number, expiry: Date) => void;
  openGuideModal?: () => void;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run type-check 2>&1 | head -20`
Expected: No errors related to options-types.ts

- [ ] **Step 3: Commit type additions**

```bash
git add src/lib/options-types.ts
git commit -m "feat: add heatmap filter and display types"
```

---

## Task 2: Create OptionsHeatmap Component

**Files:**
- Create: `src/components/invest/options/options-heatmap.tsx`

**Responsibilities:**
- Render header with ticker banner, current price, and "Options Key & Guide" button
- Render filters bar: Call/Put toggle, Mode selector, Time Range/Moneyness/Yield dropdowns, Clear Filters button
- Group contracts by strike and expiry, calculate aggregated metrics
- Build visual grid: X-axis = strikes, Y-axis = expirations
- Color-code cells by annualized yield ranges
- Handle cell click to call `onSelectContract` with contract details

**Key Functions (internal):**

```typescript
// Calculate moneyness category
function getMoneyness(strike: number, currentPrice: number): 'itm' | 'atm' | 'otm' {
  const distance = Math.abs(strike - currentPrice) / currentPrice;
  if (distance < 0.01) return 'atm';
  return strike < currentPrice ? 'itm' : 'otm';
}

// Determine cell background color by yield
function getRiskColor(annualizedYield: number): string {
  if (annualizedYield > 60) return 'bg-pink-100 dark:bg-pink-950/30';
  if (annualizedYield > 30) return 'bg-yellow-100 dark:bg-yellow-950/30';
  return 'bg-emerald-100 dark:bg-emerald-950/30';
}

// Filter and group contracts by strike + expiry
function aggregateContractsByStrikeExpiry(
  contracts: OptionContract[],
  filters: HeatmapFilterState
): Map<string, HeatmapCellData>
```

- [ ] **Step 1: Create the component file with imports and setup**

Create `src/components/invest/options/options-heatmap.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import type {
  OptionContract,
  OptionsHeatmapProps,
  HeatmapFilterState,
  MetricMode,
  MoneynessCategoryFilter,
  HeatmapCellData,
} from '@/lib/options-types';

export function OptionsHeatmap({
  ticker,
  currentPrice,
  contracts,
  onSelectContract,
  openGuideModal,
}: OptionsHeatmapProps) {
  const [filters, setFilters] = useState<HeatmapFilterState>({
    optionType: 'both',
    metricMode: 'premium',
    moneynessFilter: 'all',
  });

  // TODO: Implement helper functions and main render
}
```

- [ ] **Step 2: Add helper functions**

Inside the component, add:

```typescript
function getMoneyness(strike: number, currentPrice: number): 'itm' | 'atm' | 'otm' {
  const distance = Math.abs(strike - currentPrice) / currentPrice;
  if (distance < 0.01) return 'atm';
  return strike < currentPrice ? 'itm' : 'otm';
}

function getRiskColor(annualizedYield: number): string {
  if (annualizedYield > 60) return 'bg-pink-100 dark:bg-pink-950/30';
  if (annualizedYield > 30) return 'bg-yellow-100 dark:bg-yellow-950/30';
  return 'bg-emerald-100 dark:bg-emerald-950/30';
}

function getMetricLabel(mode: MetricMode): string {
  const labels: Record<MetricMode, string> = {
    premium: 'Premium',
    ari: 'ARI',
    delta: 'Delta',
  };
  return labels[mode];
}

function formatMetricValue(value: number, mode: MetricMode): string {
  if (mode === 'delta') {
    return value.toFixed(2);
  }
  if (mode === 'ari') {
    return `${(value * 100).toFixed(2)}%`;
  }
  return `$${value.toFixed(2)}`;
}

function aggregateContractsByStrikeExpiry(
  contractsList: OptionContract[],
  filters: HeatmapFilterState,
  currentPriceVal: number
): { strikes: number[]; expirations: Date[]; cellMap: Map<string, HeatmapCellData> } {
  const strikes = new Set<number>();
  const expirations = new Set<string>();
  const cellMap = new Map<string, HeatmapCellData>();

  for (const contract of contractsList) {
    // Apply filters
    if (filters.optionType !== 'both' && contract.optionType !== filters.optionType) {
      continue;
    }

    const moneyness = getMoneyness(contract.strike, currentPriceVal);
    if (
      filters.moneynessFilter !== 'all' &&
      moneyness !== filters.moneynessFilter
    ) {
      continue;
    }

    strikes.add(contract.strike);
    const expiryKey = contract.expiry.toISOString();
    expirations.add(expiryKey);

    const cellKey = `${contract.strike}|${expiryKey}`;
    if (!cellMap.has(cellKey)) {
      cellMap.set(cellKey, {
        strike: contract.strike,
        expiry: contract.expiry,
        metricValue: 0,
        totalPremium: 0,
        dailyYield: 0,
        annualizedYield: 0,
        callContracts: [],
        putContracts: [],
        riskLevel: contract.riskLevel,
      });
    }

    const cell = cellMap.get(cellKey)!;
    if (contract.optionType === 'call') {
      cell.callContracts.push(contract);
    } else {
      cell.putContracts.push(contract);
    }

    // Accumulate metrics (use average if multiple contracts)
    cell.totalPremium += contract.premium;
    cell.dailyYield += contract.dailyYield;
    cell.annualizedYield = contract.annualizedReturn;

    if (filters.metricMode === 'premium') {
      cell.metricValue = contract.premium;
    } else if (filters.metricMode === 'delta') {
      cell.metricValue = contract.delta;
    } else if (filters.metricMode === 'ari') {
      cell.metricValue = contract.annualizedReturn / 100;
    }
  }

  const sortedStrikes = Array.from(strikes).sort((a, b) => a - b);
  const sortedExpirations = Array.from(expirations)
    .map((key) => new Date(key))
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    strikes: sortedStrikes,
    expirations: sortedExpirations,
    cellMap,
  };
}

function getDaysToExpiry(expiry: Date): number {
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

function formatExpiryLabel(expiry: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };
  const formatted = expiry.toLocaleDateString('en-US', options);
  const dte = getDaysToExpiry(expiry);
  return `${formatted} (${dte}d)`;
}

function formatStrikeLabel(strike: number, currentPriceVal: number, optionType: 'call' | 'put'): string {
  const moneyness = getMoneyness(strike, currentPriceVal);
  const label = `$${strike.toFixed(2)}`;

  if (moneyness === 'atm') {
    return `${label} (ATM)`;
  }
  if (moneyness === 'itm') {
    return `${label} (ITM)`;
  }
  return `${label} (OTM)`;
}
```

- [ ] **Step 3: Implement filter handlers**

```typescript
const handleFilterChange = (key: keyof HeatmapFilterState, value: any) => {
  setFilters((prev) => ({
    ...prev,
    [key]: value,
  }));
};

const handleClearFilters = () => {
  setFilters({
    optionType: 'both',
    metricMode: 'premium',
    moneynessFilter: 'all',
  });
};
```

- [ ] **Step 4: Implement aggregation and data prep**

```typescript
const { strikes, expirations, cellMap } = aggregateContractsByStrikeExpiry(
  contracts,
  filters,
  currentPrice
);

// Get unique option types in data
const hasCallsInData = Array.from(cellMap.values()).some(
  (cell) => cell.callContracts.length > 0
);
const hasPutsInData = Array.from(cellMap.values()).some(
  (cell) => cell.putContracts.length > 0
);
```

- [ ] **Step 5: Implement cell click handler and cell renderer**

```typescript
const handleCellClick = (cellData: HeatmapCellData) => {
  const contractsToConsider =
    filters.optionType === 'call'
      ? cellData.callContracts
      : filters.optionType === 'put'
        ? cellData.putContracts
        : [...cellData.callContracts, ...cellData.putContracts];

  if (contractsToConsider.length > 0) {
    onSelectContract(contractsToConsider[0], cellData.strike, cellData.expiry);
  }
};

const renderCell = (cellData: HeatmapCellData | null) => {
  if (!cellData) {
    return (
      <div className="p-2 text-center text-neutral-400 dark:text-neutral-500">
        —
      </div>
    );
  }

  const riskColor = getRiskColor(cellData.annualizedYield);
  const metricLabel = getMetricLabel(filters.metricMode);
  const metricValue = formatMetricValue(cellData.metricValue, filters.metricMode);

  return (
    <button
      onClick={() => handleCellClick(cellData)}
      className={`p-3 rounded transition-all hover:shadow-md cursor-pointer border border-neutral-200 dark:border-neutral-700 ${riskColor}`}
    >
      <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
        {metricLabel}: {metricValue}
      </div>
      <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
        Premium: ${cellData.totalPremium.toFixed(2)}
      </div>
      <div className="text-xs text-neutral-600 dark:text-neutral-400">
        Yield: {(cellData.annualizedYield * 100).toFixed(1)}%
      </div>
    </button>
  );
};
```

- [ ] **Step 6: Render header section**

```typescript
return (
  <div className="space-y-6">
    {/* Header with Ticker Banner and Buttons */}
    <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
      <div>
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
          {ticker}
        </h3>
        <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
          ${currentPrice.toFixed(2)}
        </p>
      </div>
      <button
        onClick={openGuideModal}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        aria-label="Open Options Key & Guide"
      >
        <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Options Key & Guide
        </span>
      </button>
    </div>

    {/* Filters Bar */}
    <div className="bg-white dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Call/Put Toggle */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Type
          </label>
          <select
            value={filters.optionType}
            onChange={(e) =>
              handleFilterChange('optionType', e.target.value as 'call' | 'put' | 'both')
            }
            className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="both">Both</option>
            <option value="call">Calls</option>
            <option value="put">Puts</option>
          </select>
        </div>

        {/* Mode Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Mode
          </label>
          <select
            value={filters.metricMode}
            onChange={(e) =>
              handleFilterChange('metricMode', e.target.value as MetricMode)
            }
            className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="premium">Premium</option>
            <option value="ari">Annualized Return</option>
            <option value="delta">Delta</option>
          </select>
        </div>

        {/* Moneyness Filter */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Moneyness
          </label>
          <select
            value={filters.moneynessFilter}
            onChange={(e) =>
              handleFilterChange('moneynessFilter', e.target.value as MoneynessCategoryFilter)
            }
            className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="itm">In-The-Money</option>
            <option value="atm">At-The-Money</option>
            <option value="otm">Out-Of-Money</option>
          </select>
        </div>

        {/* Placeholder for future filters */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Time Range
          </label>
          <select
            disabled
            className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
          >
            <option>All</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        <div className="flex flex-col gap-2 justify-end">
          <button
            onClick={handleClearFilters}
            className="w-full px-3 py-2 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>

    {/* Grid Section */}
    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <div className="inline-block min-w-full">
        {/* Strike Header Row */}
        <div className="grid gap-0" style={{ gridTemplateColumns: `150px repeat(${strikes.length}, 120px)` }}>
          {/* Top-left corner (empty) */}
          <div className="p-3 bg-neutral-100 dark:bg-neutral-900 border-b border-r border-neutral-200 dark:border-neutral-800" />

          {/* Strike Price Headers */}
          {strikes.map((strike) => (
            <div
              key={`header-${strike}`}
              className="p-3 text-center text-xs font-semibold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-900 border-b border-r border-neutral-200 dark:border-neutral-800"
            >
              {formatStrikeLabel(strike, currentPrice, filters.optionType as 'call' | 'put')}
            </div>
          ))}
        </div>

        {/* Data Rows */}
        {expirations.map((expiry) => (
          <div key={`row-${expiry.getTime()}`} className="grid gap-0" style={{ gridTemplateColumns: `150px repeat(${strikes.length}, 120px)` }}>
            {/* Expiry Label */}
            <div className="p-3 text-xs font-semibold text-neutral-900 dark:text-white bg-neutral-50 dark:bg-neutral-950 border-b border-r border-neutral-200 dark:border-neutral-800">
              {formatExpiryLabel(expiry)}
            </div>

            {/* Data Cells */}
            {strikes.map((strike) => {
              const cellKey = `${strike}|${expiry.toISOString()}`;
              const cellData = cellMap.get(cellKey);
              return (
                <div
                  key={cellKey}
                  className="border-b border-r border-neutral-200 dark:border-neutral-800"
                >
                  {renderCell(cellData)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>

    {/* Legend */}
    <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4 border border-neutral-200 dark:border-neutral-800">
      <div className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
        Risk Color Legend
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-950/30 rounded border border-emerald-200 dark:border-emerald-800" />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            Low Risk: &lt;30% annualized yield
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-yellow-100 dark:bg-yellow-950/30 rounded border border-yellow-200 dark:border-yellow-800" />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            Medium Risk: 30-60%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-pink-100 dark:bg-pink-950/30 rounded border border-pink-200 dark:border-pink-800" />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            High Risk: &gt;60%
          </span>
        </div>
      </div>
    </div>
  </div>
);
```

- [ ] **Step 7: Verify component syntax and imports**

Run: `npm run type-check 2>&1 | grep -A 5 "options-heatmap"`
Expected: No TypeScript errors

- [ ] **Step 8: Commit heatmap component**

```bash
git add src/components/invest/options/options-heatmap.tsx
git commit -m "feat: build options heatmap component with filters and grid"
```

---

## Task 3: Integrate Heatmap into OptionsExplorationPage

**Files:**
- Modify: `src/components/invest/options/options-exploration-page.tsx`

**Changes:**
- Import `OptionsHeatmap` component
- Add state for heatmap visibility toggle
- Add state to capture selected contract from heatmap
- Render heatmap when ticker is selected
- Wire heatmap selection to pre-fill order form fields

- [ ] **Step 1: Add imports**

At the top of `options-exploration-page.tsx`, add:

```typescript
import { OptionsHeatmap } from './options-heatmap';
```

- [ ] **Step 2: Add state variables for heatmap**

Inside the component function, after existing useState calls:

```typescript
const [isHeatmapVisible, setIsHeatmapVisible] = useState(false);
const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
```

- [ ] **Step 3: Update handleSelectContract to populate heatmap data**

Replace the existing `handleSelectContract` function with:

```typescript
const handleSelectContract = (
  contract: OptionContract,
  strike: number,
  expiry: Date,
  strategy: string = 'covered_call'
) => {
  setSelectedContract(contract);
  // Pre-fill will happen via parent passing data to OptionsOrderForm
};
```

- [ ] **Step 4: Render heatmap section**

Find the Phase 2 placeholder section (around line 86-101) and replace it with:

```typescript
{/* Phase 3: Strike Heatmap */}
{selectedTicker && selectedHolding && (
  <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
        Strike Heat Map — {selectedTicker}
      </h2>
      <button
        onClick={() => setIsHeatmapVisible(!isHeatmapVisible)}
        className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
      >
        {isHeatmapVisible ? 'Hide Heatmap' : 'View Heatmap'}
      </button>
    </div>

    {isHeatmapVisible && selectedContractsList.length > 0 && (
      <OptionsHeatmap
        ticker={selectedTicker}
        currentPrice={selectedHolding.currentPrice}
        contracts={selectedContractsList}
        onSelectContract={handleSelectContract}
        openGuideModal={() => setIsGuideModalOpen(true)}
      />
    )}

    {!isHeatmapVisible && (
      <div className="flex items-center justify-center py-12 text-neutral-500 dark:text-neutral-400">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">Click "View Heatmap" to explore strike prices and expirations</p>
          <p className="text-xs">
            See returns by strike and expiration at a glance
          </p>
        </div>
      </div>
    )}
  </section>
)}
```

- [ ] **Step 5: Render the guide modal at page level**

Add this after the closing `</div>` of the main return statement:

```typescript
<OptionsGuideModal
  isOpen={isGuideModalOpen}
  onClose={() => setIsGuideModalOpen(false)}
/>
```

You'll need to import `OptionsGuideModal`:

```typescript
import { OptionsGuideModal } from './options-guide-modal';
```

- [ ] **Step 6: Verify the page structure**

Run: `npm run type-check`
Expected: No TypeScript errors

- [ ] **Step 7: Commit integration changes**

```bash
git add src/components/invest/options/options-exploration-page.tsx
git commit -m "feat: integrate options heatmap into exploration page with modal"
```

---

## Task 4: Enhance OptionsOrderForm to Accept Pre-filled Data

**Files:**
- Modify: `src/components/invest/options/options-order-form.tsx`

**Changes:**
- Add optional props for pre-filled values from heatmap selection
- Update component to use pre-filled strike/expiry when provided
- Visual indicator showing form was auto-populated

- [ ] **Step 1: Update component props interface**

Find the `OptionsOrderFormProps` interface and extend it:

```typescript
interface OptionsOrderFormProps {
  ticker: string;
  currentPrice?: number;
  onSubmit?: (order: OrderState) => void;
  isLoading?: boolean;
  // NEW: Pre-fill from heatmap selection
  prefilledStrike?: number;
  prefilledExpiry?: Date;
  onClearPrefill?: () => void;
}
```

- [ ] **Step 2: Update component to use pre-filled values**

In the `OptionsOrderForm` function body, modify the initial state:

```typescript
const [formState, setFormState] = useState<OrderState>({
  strategy: 'cash_secured_put',
  ticker,
  expiry: prefilledExpiry || new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
  strike: prefilledStrike || (currentPrice || 0),
  orderType: 'market',
  quantity: 1,
});
```

- [ ] **Step 3: Add visual indicator for pre-filled form**

Add this after the form header (before the strategy dropdown):

```typescript
{prefilledStrike && prefilledExpiry && (
  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 mb-4 flex items-center justify-between">
    <span className="text-sm text-blue-900 dark:text-blue-200">
      Form pre-filled from heatmap selection
    </span>
    <button
      type="button"
      onClick={() => {
        setFormState({
          strategy: 'cash_secured_put',
          ticker,
          expiry: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          strike: currentPrice || 0,
          orderType: 'market',
          quantity: 1,
        });
        onClearPrefill?.();
      }}
      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
    >
      Clear
    </button>
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No errors

- [ ] **Step 5: Commit form enhancement**

```bash
git add src/components/invest/options/options-order-form.tsx
git commit -m "feat: add prefill support for strike and expiry from heatmap"
```

---

## Task 5: Test Heatmap and Integration End-to-End

**Files:**
- Test: Browser manual testing (no automated tests required for this phase)

**Test Scenarios:**

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Expected: App starts without errors

- [ ] **Step 2: Navigate to Options page**

Go to: `http://localhost:3000/invest/options`
Expected: Page loads, holdings table visible

- [ ] **Step 3: Select a ticker (e.g., NVDA)**

Click "NVDA" in holdings table
Expected:
- Order form appears below with form fields
- Strike Heatmap section appears with "View Heatmap" button
- Guide modal button visible

- [ ] **Step 4: Test "View Heatmap" toggle**

Click "View Heatmap" button
Expected:
- Heatmap grid renders with:
  - Ticker banner showing `NVDA $128.34`
  - Filter controls (Type, Mode, Moneyness, Clear Filters)
  - Grid with strike prices on X-axis, expiration dates on Y-axis
  - Color-coded cells (green, yellow, pink based on yield)
  - "Options Key & Guide" button

- [ ] **Step 5: Test filter controls**

Change dropdown values and verify grid updates:
- Change "Type" from "Both" to "Calls" → Only calls visible
- Change "Mode" to "Annualized Return" → Values change to percentages
- Change "Moneyness" to "ITM" → Only in-the-money strikes shown
- Click "Clear Filters" → Reset to defaults

- [ ] **Step 6: Test heatmap cell click**

Click a cell in the grid (non-empty cell)
Expected:
- Form strike and expiry are updated
- Blue info box appears: "Form pre-filled from heatmap selection"
- Form shows the selected strike price and expiration date

- [ ] **Step 7: Test guide modal**

Click "Options Key & Guide" button in heatmap header
Expected:
- Modal opens with educational content
- Can close via X button or background click
- Dark mode styling works

- [ ] **Step 8: Test dark mode**

Toggle system dark mode (DevTools or OS)
Expected:
- All colors transition smoothly
- Text remains readable
- Border colors adapt
- Grid legend visible in both modes

- [ ] **Step 9: Test responsive layout**

Resize browser to mobile width (< 768px)
Expected:
- Filter controls stack vertically
- Grid scrolls horizontally on small screens
- Header and legend adapt

- [ ] **Step 10: Verify no console errors**

Open DevTools console
Expected: No errors or warnings related to heatmap component

- [ ] **Step 11: Create final commit with test notes**

```bash
git add -A
git commit -m "test: verify heatmap rendering and integration with order form"
```

---

## Task 6: Documentation & Summary

**Files:**
- Create: `PHASE_3_HEATMAP.md` (reference guide for future developers)

- [ ] **Step 1: Create reference documentation**

Create `docs/phase-3-heatmap-reference.md`:

```markdown
# Phase 3: Options Heatmap Grid

## Overview
The OptionsHeatmap component provides a visual matrix of available option contracts, organized by strike price and expiration date.

## Component: OptionsHeatmap

**Location:** `src/components/invest/options/options-heatmap.tsx`

**Props:**
```typescript
interface OptionsHeatmapProps {
  ticker: string;                                          // Stock symbol
  currentPrice: number;                                    // Current stock price
  contracts: OptionContract[];                             // Available contracts
  onSelectContract: (contract: OptionContract, strike: number, expiry: Date) => void;
  openGuideModal?: () => void;                             // Callback to open guide
}
```

**Key Features:**
- **Header:** Ticker banner with current price and guide button
- **Filters:** Call/Put toggle, metric mode selector (Premium/ARI/Delta), moneyness filter, clear button
- **Grid:** Interactive matrix with color-coded cells
- **Risk Color Coding:**
  - Green: <30% annualized yield (low risk)
  - Yellow: 30-60% yield (medium risk)
  - Pink: >60% yield (high risk)

## Integration Points

### OptionsExplorationPage
- Manages heatmap visibility state
- Passes contracts and callbacks to heatmap
- Receives selected contract from heatmap
- Renders guide modal

### OptionsOrderForm
- Accepts `prefilledStrike` and `prefilledExpiry` props
- Displays info box when pre-filled
- Supports clearing pre-filled values

## Future Enhancements
- Add time range filter (7/14/21/30/45 DTE)
- Add yield range slider
- Export grid data as CSV
- Add Greeks visualization (Gamma, Vega, Theta)
- Historical heatmap comparison

## Testing Checklist
- [ ] Heatmap renders with correct grid dimensions
- [ ] Filters update grid correctly
- [ ] Cell clicks pre-fill form
- [ ] Modal opens from header button
- [ ] Dark mode colors render properly
- [ ] Mobile horizontal scroll works
- [ ] No console errors
```

- [ ] **Step 2: Update main PHASE documentation**

Append to `PHASE_2_OPTIONS.md`:

```markdown

---

# PHASE 3: Options Heatmap Grid (Complete)

**Commit:** [INSERT LATEST COMMIT HASH]

## Overview

PHASE 3 implements the interactive strike/expiration heatmap visualization, completing the core options exploration interface.

## Components Created

### 1. OptionsHeatmap Component
**Location:** `src/components/invest/options/options-heatmap.tsx`

See `docs/phase-3-heatmap-reference.md` for full details.

## Integration Summary

The heatmap integrates seamlessly with existing components:

```
OptionsExplorationPage
├── Holdings Table (Phase 1) → Select ticker
├── Order Form (Phase 2) → Place orders
├── OptionsHeatmap (Phase 3) ← View all contracts visually
│   └── Clicking cell → Pre-fills Order Form
└── Guide Modal (Phase 2) ← Help button

```

## File Changes

- **Created:** `src/components/invest/options/options-heatmap.tsx`
- **Modified:** `src/components/invest/options/options-exploration-page.tsx`
- **Modified:** `src/components/invest/options/options-order-form.tsx`
- **Modified:** `src/lib/options-types.ts`

## What Users Can Do Now

1. Select a holding from the holdings table
2. View all available option contracts in a visual heatmap
3. Filter by call/put, metric mode (premium/ARI/delta), moneyness
4. Click any cell to pre-fill the order form with that contract's details
5. Submit orders with pre-filled values or adjust before submitting

## Future Work

See Phase 4+ in PHASE_2_OPTIONS.md for planned enhancements.
```

- [ ] **Step 3: Final commit**

```bash
git add docs/phase-3-heatmap-reference.md PHASE_2_OPTIONS.md
git commit -m "docs: add phase 3 heatmap documentation and integration guide"
```

---

## Verification Checklist

Before marking complete, verify:

- [ ] TypeScript compilation passes (`npm run type-check`)
- [ ] No console errors in browser
- [ ] Heatmap renders with correct grid structure
- [ ] All filters work and update grid
- [ ] Cell clicks pre-fill order form
- [ ] Dark mode colors work
- [ ] Mobile responsive (grid scrolls horizontally)
- [ ] Guide modal opens/closes correctly
- [ ] All commits have descriptive messages
- [ ] No hardcoded test data in final code
- [ ] All props are TypeScript-typed
- [ ] Accessibility: keyboard navigation works for filters and buttons

---

## Implementation Notes

### Architecture Decisions

1. **Filter State Local to Heatmap:** Keeps component self-contained. Parent doesn't manage filter state, reducing prop drilling.

2. **Single Contract Aggregation:** Multiple contracts at same strike/expiry are aggregated for display. First contract in list is used on click. Could be enhanced to show strategy picker for multiple contracts at same strike/expiry.

3. **CSS Grid Layout:** Grid dimensions are dynamic based on strike/expiry counts. No external charting library needed; pure HTML/CSS/Tailwind.

4. **Color by Annualized Yield:** Chosen because it's most informative for income strategies. Could be parameterized in future versions.

5. **Pre-fill vs. Auto-fill:** Form is pre-filled (user sees values) but not auto-submitted. Allows review before placement.

### Known Limitations (Future Work)

- Time range filter stub (UI present, no functionality)
- No multi-leg strategy selection (always picks first contract)
- No export/download of grid data
- No historical comparison
- Limited to 5 expirations and ~7 strikes per ticker in mock data (realistic with live data)

### Performance Considerations

- Aggregation happens on every filter change (acceptable for current data size: ~500 contracts max)
- Memoization could be added if component becomes slow with 1000+ contracts
- Grid CSS recalculates on strike/expiry count change (negligible impact)

---
