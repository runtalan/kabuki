# Options Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Options Guide Modal (educational component) and Options Order Form to the options page, replacing the Phase 2 placeholder and integrating form state management with parent control.

**Architecture:** Two new sibling components—OptionsGuideModal and OptionsOrderForm—composed within OptionsExplorationPage. Modal displays Greeks, DTE windows, and formulas in a cleanly formatted education interface. Form accepts controlled props (strategy, ticker, etc.) and emits changes to parent via callbacks; info icon next to strategy dropdown opens the modal. Page state lifts form inputs and modal visibility into OptionsExplorationPage.

**Tech Stack:** React 19.2.8, Next.js 16.3.0, Tailwind CSS, Lucide React (icons), TypeScript, existing options-types.ts

## Global Constraints

- Use Tailwind CSS for all styling (existing color palette: neutral, no custom colors)
- Conform to existing types in `src/lib/options-types.ts` (OrderStrategy, OrderType, OrderState)
- Client-side components only (`'use client'` directive)
- No external modal/form libraries; build with native HTML + Tailwind
- Info icon uses `lucide-react` (existing dependency)
- Dark mode support throughout (dark: classes)

---

## File Structure

**Files to create:**
- `src/components/invest/options/options-guide-modal.tsx` — Educational modal showing Greeks, DTE windows, formulas
- `src/components/invest/options/options-order-form.tsx` — Order form with strategy dropdown, inputs, and modal toggle

**Files to modify:**
- `src/components/invest/options/options-exploration-page.tsx` — Lift state for form and modal; integrate both components

---

## Task 1: Create OptionsGuideModal Component

**Files:**
- Create: `src/components/invest/options/options-guide-modal.tsx`

**Interfaces:**
- Consumes: (none—receives props only)
- Produces: `OptionsGuideModal` component
  - Props: `open: boolean`, `onClose: () => void`
  - Renders: Modal with Greeks, DTE Strategy Windows, Formulas Reference sections

**Steps:**

- [ ] **Step 1: Create the component file**

Create `src/components/invest/options/options-guide-modal.tsx` with the OptionsGuideModal component. This modal displays four sections: header with close button, Greeks definitions (Theta and Gamma), DTE Strategy Windows breakdown (45 DTE, 21 DTE, 7 DTE), and Formulas Reference.

```typescript
'use client';

import { X } from 'lucide-react';

interface OptionsGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export function OptionsGuideModal({ open, onClose }: OptionsGuideModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-neutral-950 shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Options Trading Guide
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-8 p-6">
          {/* Greeks Section */}
          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
              The Greeks
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Key metrics that help you understand option behavior and risk:
            </p>
            <div className="space-y-4">
              <div className="rounded-lg bg-neutral-50 dark:bg-neutral-900/50 p-4 border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-neutral-900 dark:text-white mb-1">
                      Theta (Time Decay)
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      The dollar amount an option decreases in value each day as expiration approaches.
                      Positive theta works in your favor when selling options (short positions).
                    </p>
                  </div>
                  <div className="text-lg font-mono font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                    −$X/day
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-neutral-50 dark:bg-neutral-900/50 p-4 border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-neutral-900 dark:text-white mb-1">
                      Gamma (Acceleration Risk)
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      The rate at which delta changes as the stock price moves. High gamma inside 21 DTE
                      means your position's delta (directional exposure) can swing wildly with stock moves.
                    </p>
                  </div>
                  <div className="text-lg font-mono font-semibold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                    Risk Factor
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* DTE Strategy Windows */}
          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
              DTE Strategy Windows
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Days to Expiration (DTE) breaks into distinct trading phases with different risk/reward profiles:
            </p>
            <div className="space-y-3">
              <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-neutral-900 dark:text-white mb-1">
                      45 DTE (Sweet Spot)
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Optimal entry point. Theta decay is accelerating but not violent. Delta is predictable.
                      Sell premium here when conditions align with your strategy.
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    Entry Zone
                  </div>
                </div>
              </div>

              <div className="rounded-lg border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-neutral-900 dark:text-white mb-1">
                      21 DTE (Exit Zone)
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Theta accelerates sharply. Gamma becomes elevated—your position can move unpredictably.
                      Consider closing profitable positions or rolling to later expirations.
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                    Management Zone
                  </div>
                </div>
              </div>

              <div className="rounded-lg border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-neutral-900 dark:text-white mb-1">
                      7 DTE (High Risk)
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Extreme gamma and theta. One bad move can blow out your position. Only for experienced traders.
                      Close positions or accept max risk—time decay moves the needle hourly.
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                    High Risk
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Formulas Reference */}
          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Formulas Reference
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Quick reference for the math behind premium and yield calculations:
            </p>
            <div className="space-y-4">
              <div className="rounded-lg bg-neutral-900 dark:bg-neutral-800 p-4 font-mono text-sm text-neutral-100 overflow-x-auto">
                <div className="mb-3">
                  <div className="text-neutral-400 mb-1">Total Premium</div>
                  <div className="text-white">
                    Total Premium = Bid Price × 100
                  </div>
                </div>
                <div className="text-xs text-neutral-500 mt-2">
                  Example: $2.50 bid × 100 = $250 per contract
                </div>
              </div>

              <div className="rounded-lg bg-neutral-900 dark:bg-neutral-800 p-4 font-mono text-sm text-neutral-100 overflow-x-auto">
                <div className="mb-3">
                  <div className="text-neutral-400 mb-1">Daily Income</div>
                  <div className="text-white">
                    Daily Income = Total Premium ÷ DTE
                  </div>
                </div>
                <div className="text-xs text-neutral-500 mt-2">
                  Example: $250 ÷ 45 days = $5.56 per day
                </div>
              </div>

              <div className="rounded-lg bg-neutral-900 dark:bg-neutral-800 p-4 font-mono text-sm text-neutral-100 overflow-x-auto">
                <div className="mb-3">
                  <div className="text-neutral-400 mb-1">Annualized Return</div>
                  <div className="text-white">
                    Annualized Return = (Daily Income × 365) ÷ Collateral
                  </div>
                </div>
                <div className="text-xs text-neutral-500 mt-2">
                  Example: ($5.56 × 365) ÷ $5,000 collateral = 40.5% annual yield
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 text-xs text-neutral-500 dark:text-neutral-400">
            <p>
              ⚠️ <strong>Risk Disclaimer:</strong> Options trading carries substantial risk. Past performance does not guarantee future results. Always understand the Greeks, manage your position sizes, and never risk more than you can afford to lose.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify component renders with modal open/closed**

Manually test: Import and render `OptionsGuideModal` with `open={true}` and `open={false}` in the dev server. Verify:
- Modal appears centered when `open={true}`
- Modal hidden when `open={false}`
- Close button (X) is clickable and positioned top-right
- All text sections render (Greeks, DTE, Formulas)
- Dark mode classes apply correctly (use dev tools to toggle dark mode)

---

## Task 2: Create OptionsOrderForm Component

**Files:**
- Create: `src/components/invest/options/options-order-form.tsx`

**Interfaces:**
- Consumes: 
  - `strategy: OrderStrategy` (from options-types)
  - `ticker: string`
  - `expiry: Date`
  - `strike: number`
  - `orderType: OrderType` (from options-types)
  - `limitPrice?: number`
  - `quantity: number`
  - `onStrategyChange: (value: OrderStrategy) => void`
  - `onTickerChange: (value: string) => void`
  - `onExpiryChange: (value: Date) => void`
  - `onStrikeChange: (value: number) => void`
  - `onOrderTypeChange: (value: OrderType) => void`
  - `onLimitPriceChange: (value?: number) => void`
  - `onQuantityChange: (value: number) => void`
  - `onOpenGuide: () => void`

- Produces: `OptionsOrderForm` component
  - Renders: Form with all required fields, info icon next to strategy dropdown

**Steps:**

- [ ] **Step 1: Create the component file**

Create `src/components/invest/options/options-order-form.tsx` with the OptionsOrderForm component. This form has a two-column layout on desktop with all required fields and an info icon next to the strategy dropdown.

```typescript
'use client';

import { HelpCircle } from 'lucide-react';
import type { OrderStrategy, OrderType } from '@/lib/options-types';

interface OptionsOrderFormProps {
  strategy: OrderStrategy;
  ticker: string;
  expiry: Date;
  strike: number;
  orderType: OrderType;
  limitPrice?: number;
  quantity: number;
  onStrategyChange: (value: OrderStrategy) => void;
  onTickerChange: (value: string) => void;
  onExpiryChange: (value: Date) => void;
  onStrikeChange: (value: number) => void;
  onOrderTypeChange: (value: OrderType) => void;
  onLimitPriceChange: (value?: number) => void;
  onQuantityChange: (value: number) => void;
  onOpenGuide: () => void;
}

export function OptionsOrderForm({
  strategy,
  ticker,
  expiry,
  strike,
  orderType,
  limitPrice,
  quantity,
  onStrategyChange,
  onTickerChange,
  onExpiryChange,
  onStrikeChange,
  onOrderTypeChange,
  onLimitPriceChange,
  onQuantityChange,
  onOpenGuide,
}: OptionsOrderFormProps) {
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = e.target.value.split('-').map(Number);
    onExpiryChange(new Date(year, month - 1, day));
  };

  return (
    <form className="space-y-6">
      {/* Strategy and Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Strategy
            <button
              type="button"
              onClick={onOpenGuide}
              className="inline-flex items-center justify-center rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors"
              title="Open Options Guide"
              aria-label="Open Options Guide"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </label>
          <select
            value={strategy}
            onChange={(e) => onStrategyChange(e.target.value as OrderStrategy)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="cash_secured_put">Cash Secured Put</option>
            <option value="covered_call">Covered Call</option>
            <option value="buy_call">Buy to Call</option>
          </select>
        </div>

        {/* Ticker */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Ticker
          </label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => onTickerChange(e.target.value.toUpperCase())}
            placeholder="e.g., AAPL"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Expiration and Strike */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Expiration Date
          </label>
          <input
            type="date"
            value={formatDateForInput(expiry)}
            onChange={handleExpiryChange}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Strike Price
          </label>
          <input
            type="number"
            step="0.01"
            value={strike}
            onChange={(e) => onStrikeChange(parseFloat(e.target.value) || 0)}
            placeholder="e.g., 150.00"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Order Type and Limit Price */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Order Type
          </label>
          <select
            value={orderType}
            onChange={(e) => onOrderTypeChange(e.target.value as OrderType)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="market">Market</option>
            <option value="limit">Limit</option>
          </select>
        </div>

        {orderType === 'limit' && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Limit Price
            </label>
            <input
              type="number"
              step="0.01"
              value={limitPrice ?? ''}
              onChange={(e) => onLimitPriceChange(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="e.g., 2.50"
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>
        )}
      </div>

      {/* Quantity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Quantity (Contracts)
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-950"
        >
          Review Order
        </button>
        <button
          type="button"
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify form renders with all fields**

Manually test: Render `OptionsOrderForm` with initial values in the dev server. Verify:
- All input fields render (Strategy, Ticker, Expiration, Strike, Order Type, Limit Price, Quantity)
- Info icon appears next to Strategy label and is clickable
- Limit Price input only shows when Order Type is "limit"
- Form layout is responsive (1 column on mobile, 2 columns on desktop)
- Dark mode classes apply correctly
- All onChange callbacks fire when inputs change (use console.log to verify)

---

## Task 3: Update OptionsExplorationPage to Lift State and Integrate Components

**Files:**
- Modify: `src/components/invest/options/options-exploration-page.tsx` (replace Phase 2 placeholder section with form)

**Interfaces:**
- Consumes: All props passed in from parent (holdings, availableContracts, currentPriceMap)
- Produces: Updated page with form state lifted, modal visibility state, and both components rendered

**Steps:**

- [ ] **Step 1: Lift state for form and modal**

Update the OptionsExplorationPage component to add state for the form inputs and modal visibility. Add `useState` import and create initial state for `guideModalOpen`, and all form fields.

```typescript
'use client';

import { useState } from 'react';
import { HoldingsTable } from './holdings-table';
import { OptionsContractsTable } from './options-contracts-table';
import { OptionsGuideModal } from './options-guide-modal';
import { OptionsOrderForm } from './options-order-form';
import type { Holding, OptionContract, OrderStrategy, OrderType } from '@/lib/options-types';

interface OptionsExplorationPageProps {
  holdings: Holding[];
  availableContracts: OptionContract[];
  currentPriceMap: Record<string, number>;
}

export function OptionsExplorationPage({
  holdings,
  availableContracts,
  currentPriceMap,
}: OptionsExplorationPageProps) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<OptionContract | null>(null);
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  // Form state
  const [formStrategy, setFormStrategy] = useState<OrderStrategy>('covered_call');
  const [formTicker, setFormTicker] = useState('');
  const [formExpiry, setFormExpiry] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 45);
    return date;
  });
  const [formStrike, setFormStrike] = useState(0);
  const [formOrderType, setFormOrderType] = useState<OrderType>('market');
  const [formLimitPrice, setFormLimitPrice] = useState<number | undefined>();
  const [formQuantity, setFormQuantity] = useState(1);

  const selectedHolding = holdings.find((h) => h.ticker === selectedTicker);
  const selectedContractsList = selectedTicker
    ? availableContracts.filter((c) => c.ticker === selectedTicker)
    : [];

  const handleSelectContract = (contract: OptionContract, strategy: string) => {
    setSelectedContract(contract);
  };

  // When a holding is selected, update form ticker
  const handleSelectHolding = (ticker: string) => {
    setSelectedTicker(ticker);
    setFormTicker(ticker);
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-white">
          Options Exploration
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-300">
          Analyze options strategies for your holdings and optimize income generation
        </p>
      </div>

      {/* Phase 1: Holdings Analysis */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
          Your Holdings
        </h2>
        <HoldingsTable holdings={holdings} onSelectHolding={handleSelectHolding} />
      </section>

      {/* Phase 2: Order Form */}
      {selectedTicker && selectedHolding && (
        <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-8">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-6">
            Order Builder — {selectedTicker}
          </h2>
          <OptionsOrderForm
            strategy={formStrategy}
            ticker={formTicker}
            expiry={formExpiry}
            strike={formStrike}
            orderType={formOrderType}
            limitPrice={formLimitPrice}
            quantity={formQuantity}
            onStrategyChange={setFormStrategy}
            onTickerChange={setFormTicker}
            onExpiryChange={setFormExpiry}
            onStrikeChange={setFormStrike}
            onOrderTypeChange={setFormOrderType}
            onLimitPriceChange={setFormLimitPrice}
            onQuantityChange={setFormQuantity}
            onOpenGuide={() => setGuideModalOpen(true)}
          />
        </section>
      )}

      {/* Phase 1: Options Contracts Table */}
      {selectedTicker && selectedContractsList.length > 0 && selectedHolding && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
            Available Strategies
          </h2>
          <OptionsContractsTable
            contracts={selectedContractsList}
            ticker={selectedTicker}
            currentPrice={selectedHolding.currentPrice}
            onSelectContract={handleSelectContract}
          />
        </section>
      )}

      {/* Phase 2: Strategy Heatmap Placeholder */}
      {selectedTicker && (
        <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-8">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-6">
            Strike Heat Map — {selectedTicker}
          </h2>
          <div className="flex items-center justify-center py-12 text-neutral-500 dark:text-neutral-400">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">Visual heat map coming in Phase 3</p>
              <p className="text-xs">
                See returns by strike and expiration at a glance
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {!selectedTicker && (
        <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-12 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <p className="text-neutral-600 dark:text-neutral-400 font-medium">
              Select a holding to explore options strategies
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Click any ticker in the table above to view available options and build positions
            </p>
          </div>
        </section>
      )}

      {/* Options Guide Modal */}
      <OptionsGuideModal open={guideModalOpen} onClose={() => setGuideModalOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 2: Verify page renders with form above holdings table**

Manually test in dev server:
- Page renders with Holdings table
- Select a holding by clicking on it
- Order Builder section appears below Holdings with the form
- Info icon next to Strategy dropdown is visible and clickable
- Clicking info icon opens the Options Guide Modal
- Close button on modal works and modal disappears
- All form inputs are interactive (change values and verify state updates via console logging if needed)
- Modal and form render correctly in dark mode

---

## Task 4: Integration Testing and Polish

**Files:**
- No new files; verification only

**Steps:**

- [ ] **Step 1: Test full user flow**

In dev server:
1. Navigate to /invest/options
2. Verify Holdings table displays (should have mock data)
3. Click a ticker row to select it
4. Verify Order Builder section appears
5. Verify all form fields are editable
6. Verify changing values doesn't reset other fields
7. Click the info icon next to Strategy dropdown
8. Verify Options Guide Modal opens with all sections (Greeks, DTE, Formulas)
9. Verify Close button on modal works
10. Verify modal doesn't appear after closing
11. Verify form is still intact after modal interaction

- [ ] **Step 2: Test dark mode**

Toggle dark mode in dev tools:
1. Verify all form inputs have proper dark mode styling
2. Verify modal has proper dark mode styling
3. Verify text contrast is acceptable in both modes
4. Verify icons and buttons are visible in both modes

- [ ] **Step 3: Test responsive design**

Resize browser window or use device emulation:
1. Verify form layout stacks to 1 column on mobile
2. Verify form layout shows 2 columns on desktop (md breakpoint)
3. Verify all inputs remain accessible on mobile
4. Verify modal is readable on mobile (max-height and overflow handled)

- [ ] **Step 4: Commit**

```bash
git add src/components/invest/options/options-guide-modal.tsx \
        src/components/invest/options/options-order-form.tsx \
        src/components/invest/options/options-exploration-page.tsx
git commit -m "feat: add Options Guide Modal and Order Form for Phase 2

- OptionsGuideModal: Educational component showing Greeks (Theta/Gamma), DTE Strategy Windows (45/21/7 DTE), and formula references
- OptionsOrderForm: Controlled form with strategy, ticker, expiration, strike, order type, limit price, and quantity; info icon toggles guide modal
- OptionsExplorationPage: Lifted state for form and modal; integrated form above Holdings table; modal closes on explicit user action"
```

---

## Summary

**Phase 2 adds:**
1. **OptionsGuideModal** — Education component with Greeks, DTE windows, and formulas in a clean modal interface
2. **OptionsOrderForm** — Fully controlled form component with all required fields and modal toggle
3. **State management** — OptionsExplorationPage lifts form state and modal visibility; form is parent-controlled

**Testing checklist:**
- ✅ All fields render and are interactive
- ✅ Modal opens/closes correctly
- ✅ Dark mode applies throughout
- ✅ Responsive layout (mobile/desktop)
- ✅ No console errors

**Next phase (Phase 3):** Strike Heat Map visualization linking form selections to strategy recommendations.
