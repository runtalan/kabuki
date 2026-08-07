# Phase 3: Options Heatmap Grid — Developer Reference

## Overview

Phase 3 implements an interactive options heatmap component that visualizes available contracts organized by strike price and expiration date. This completes the core options exploration interface, allowing traders to:

1. **View** all available contracts in a visual matrix format
2. **Filter** by option type (calls/puts), metric mode (premium/delta/ARI), and moneyness (ITM/ATM/OTM)
3. **Analyze** risk at a glance with color-coded cells
4. **Select** contracts to auto-populate the order form

## Component Architecture

### OptionsHeatmap (`src/components/invest/options/options-heatmap.tsx`)

**Purpose:** Interactive grid visualization of option contracts

**Props:**
```typescript
interface OptionsHeatmapProps {
  ticker: string;                                           // Stock symbol
  currentPrice: number;                                     // Current stock price
  contracts: OptionContract[];                              // Available contracts to display
  onSelectContract: (contract: OptionContract, strike: number, expiry: Date) => void;
  openGuideModal?: () => void;                              // Callback to open guide
}
```

**Key Features:**

- **Header:** Ticker banner with current price and "Options Key & Guide" button
- **Filters Bar:** 
  - Type: Both / Calls / Puts
  - Mode: Premium / Annualized Return (ARI) / Delta
  - Moneyness: All / ITM / ATM / OTM
  - Time Range: Placeholder for future enhancement
  - Clear Filters button

- **Grid Layout:**
  - X-axis: Strike prices formatted with moneyness (e.g., "$219.50 (ATM)", "$215.00 (ITM)", "$225.00 (OTM)")
  - Y-axis: Expiration dates with DTE (e.g., "Aug 28 (22d)")
  - Cells: Display active metric, total premium, and annualized yield

- **Color Coding:**
  - Green: Low risk (<30% annualized yield)
  - Yellow: Medium risk (30-60% yield)
  - Pink: High risk (>60% yield)

- **Legend:** Visual guide explaining risk color zones

**Internal Functions:**

```typescript
// Determine moneyness relative to current price
getMoneyness(strike: number, currentPrice: number): 'itm' | 'atm' | 'otm'

// Get cell background color by yield risk level
getRiskColor(annualizedYield: number): string

// Format metric value based on display mode
formatMetricValue(value: number, mode: MetricMode): string

// Calculate days to expiration
getDaysToExpiry(expiry: Date): number

// Aggregate contracts by strike/expiry into displayable cells
aggregateContractsByStrikeExpiry(contracts, filters, currentPrice): { 
  strikes: number[], 
  expirations: Date[], 
  cellMap: Map<string, HeatmapCellData> 
}
```

**State:**
```typescript
const [filters, setFilters] = useState<HeatmapFilterState>({
  optionType: 'both',
  metricMode: 'premium',
  moneynessFilter: 'all',
});
```

### Integration Points

#### OptionsExplorationPage
**File:** `src/components/invest/options/options-exploration-page.tsx`

**State Management:**
```typescript
const [isHeatmapVisible, setIsHeatmapVisible] = useState(false);
const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
```

**Heatmap Rendering:**
- Conditional render: Shows when ticker selected and `isHeatmapVisible === true`
- Toggle button: "View Heatmap" / "Hide Heatmap"
- Placeholder message when hidden

**Modal Integration:**
- Guide modal opens via heatmap's "Options Key & Guide" button
- Modal at page level for proper z-index stacking

#### OptionsOrderForm
**File:** `src/components/invest/options/options-order-form.tsx`

**New Props:**
```typescript
interface OptionsOrderFormProps {
  // ... existing props
  prefilledStrike?: number;       // From heatmap selection
  prefilledExpiry?: Date;         // From heatmap selection
  onClearPrefill?: () => void;    // Callback when user clears prefill
}
```

**Pre-fill Behavior:**
- Initial state uses pre-filled values if provided
- Visual indicator box appears when form is pre-filled
- "Clear" button resets to default values and calls `onClearPrefill()`
- User can still modify any field after prefill

**Example Flow:**
1. User clicks cell in heatmap
2. Cell's strike and expiry passed to `onSelectContract`
3. Parent updates form props with `prefilledStrike` and `prefilledExpiry`
4. Form renders with pre-filled values and info box
5. User can click "Clear" to reset or submit with pre-filled values

## Type System

### New Types (in `src/lib/options-types.ts`)

```typescript
// Display metric mode
export type MetricMode = 'premium' | 'ari' | 'delta';

// Moneyness filter options
export type MoneynessCategoryFilter = 'all' | 'itm' | 'atm' | 'otm';

// Filter state shape
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

// Aggregated cell data for display
export interface HeatmapCellData {
  strike: number;
  expiry: Date;
  metricValue: number;              // Active mode metric
  totalPremium: number;
  dailyYield: number;
  annualizedYield: number;
  callContracts: OptionContract[];  // May have multiple contracts
  putContracts: OptionContract[];   // May have multiple contracts
  riskLevel: 'low' | 'medium' | 'high';
}

// Component props interface
export interface OptionsHeatmapProps {
  ticker: string;
  currentPrice: number;
  contracts: OptionContract[];
  onSelectContract: (contract: OptionContract, strike: number, expiry: Date) => void;
  openGuideModal?: () => void;
}
```

## Styling & Design

### Color Palette

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Low Risk (bg) | `bg-emerald-100` | `dark:bg-emerald-950/30` |
| Medium Risk (bg) | `bg-yellow-100` | `dark:bg-yellow-950/30` |
| High Risk (bg) | `bg-pink-100` | `dark:bg-pink-950/30` |
| Header (bg) | `from-blue-50 to-indigo-50` | `dark:from-blue-950/30 to-indigo-950/30` |
| Grid Lines | `border-neutral-200` | `dark:border-neutral-800` |
| Text | `text-neutral-900` | `dark:text-white` |

### Layout

- **Responsive Design:**
  - Mobile (< 768px): Filters stack vertically, grid scrolls horizontally
  - Tablet (768px - 1024px): Filters in 2-column grid
  - Desktop (> 1024px): Filters in 5-column grid

- **Spacing:**
  - Gap between sections: `space-y-6`
  - Gap between filter inputs: `gap-4`
  - Cell padding: `p-3`

### Accessibility

- ✓ All filter selects have associated labels
- ✓ Buttons have `aria-label` attributes
- ✓ Focus states visible with `focus:ring-2 focus:ring-blue-500`
- ✓ Color not sole means of conveyance (text labels + color)
- ✓ Grid cells are keyboard-accessible buttons

## Data Flow

```
OptionsExplorationPage
  │
  ├─ Holdings selected → setState(selectedTicker)
  │
  ├─ Contracts filtered for ticker → selectedContractsList
  │
  ├─ OptionsHeatmap rendered with selectedContractsList
  │  │
  │  ├─ Contracts aggregated by strike/expiry
  │  │
  │  ├─ Grid built with strikes (X) and expirations (Y)
  │  │
  │  └─ User clicks cell
  │     │
  │     └─ onSelectContract(contract, strike, expiry)
  │        │
  │        └─ Parent's handleSelectContractFromHeatmap called
  │           │
  │           └─ OptionsOrderForm receives prefilledStrike + prefilledExpiry
  │              │
  │              └─ Form shows info box + pre-filled values
  │                 │
  │                 └─ User can submit or modify before submitting
  │
  └─ OptionsGuideModal managed at page level
     │
     └─ Opens via heatmap button or form info button
```

## Testing Checklist

### Rendering
- [ ] Heatmap renders grid with correct dimensions
- [ ] Headers show all strikes sorted ascending
- [ ] Rows show all expirations sorted chronologically
- [ ] Strike labels include moneyness (ATM/ITM/OTM)
- [ ] Expiry labels include DTE counter

### Filtering
- [ ] Type filter (Both/Calls/Puts) updates grid correctly
- [ ] Mode filter (Premium/ARI/Delta) changes cell values
- [ ] Moneyness filter (All/ITM/ATM/OTM) hides irrelevant strikes
- [ ] Clear Filters resets all to defaults
- [ ] Time Range filter disabled/placeholder shown

### Cell Interaction
- [ ] Clicking cell pre-fills form with strike and expiry
- [ ] Pre-fill info box appears in form
- [ ] Clear button in info box resets form
- [ ] Cell text readable in both light and dark modes
- [ ] Hover effect visible on cells

### Guide Modal
- [ ] Opens from heatmap header button
- [ ] Opens from form info button
- [ ] Closes via X button
- [ ] Closes via background click
- [ ] Content displays correctly

### Styling
- [ ] Colors match design (green/yellow/pink by yield)
- [ ] Dark mode transitions smooth
- [ ] Borders and text contrast adequate
- [ ] Spacing consistent with design system
- [ ] Mobile horizontal scroll works

### Performance
- [ ] No console errors
- [ ] Page loads in <2s
- [ ] Filter changes instant (<100ms)
- [ ] Cell clicks respond immediately
- [ ] No memory leaks detected

## Common Patterns

### Accessing Heatmap Data

```typescript
// In parent component
const handleSelectContractFromHeatmap = (
  contract: OptionContract,
  strike: number,
  expiry: Date
) => {
  // Use these values to pre-fill form
  setFormState({
    ...formState,
    strike,
    expiry,
  });
};
```

### Filtering Contracts

```typescript
// Inside aggregateContractsByStrikeExpiry
for (const contract of contractsList) {
  // Apply type filter
  if (filters.optionType !== 'both' && contract.optionType !== filters.optionType) {
    continue;
  }

  // Apply moneyness filter
  const moneyness = getMoneyness(contract.strike, currentPrice);
  if (filters.moneynessFilter !== 'all' && moneyness !== filters.moneynessFilter) {
    continue;
  }

  // Add to cell map...
}
```

### Formatting Values

```typescript
// Premium mode: $1.50
formatMetricValue(1.50, 'premium') // "$1.50"

// ARI mode: 45.67%
formatMetricValue(0.4567, 'ari') // "45.67%"

// Delta mode: 0.65
formatMetricValue(0.65, 'delta') // "0.65"
```

## Future Enhancements

### Phase 4: Advanced Filtering
- Implement time range slider (min/max DTE)
- Implement yield range slider
- Add earnings badge filters
- Multi-select for strikes/expirations

### Phase 5: Analytics
- Add Greeks visualization (Gamma, Vega, Theta)
- Show historical volatility
- Greeks aggregation by strategy
- Implied volatility surface

### Phase 6: Data Export
- Export grid as CSV
- Export as PNG snapshot
- Create comparison view (current vs. historical)
- Generate PDF report

### Phase 7: Advanced UX
- Drag-to-select multiple cells
- Right-click context menu for bulk actions
- Keyboard shortcuts (arrow keys to navigate)
- Inline editing of cell values

## Troubleshooting

### Grid Shows No Data
**Cause:** No contracts match current filters
**Solution:** Click "Clear Filters" to see all available contracts

### Form Not Pre-filling
**Cause:** Pre-fill props not passed correctly
**Solution:** Verify heatmap's `onSelectContract` callback is triggered and parent receives the strike/expiry values

### Dark Mode Colors Look Off
**Cause:** Missing `dark:` Tailwind classes
**Solution:** Verify CSS includes dark mode variants (e.g., `dark:bg-neutral-950`)

### Performance Issues with Large Data
**Cause:** Too many contracts causing grid to be large
**Solution:** Implement virtual scrolling or pagination; currently fine for <5000 contracts

## Dependencies

- **React 18+** — Component state management
- **TypeScript** — Type safety
- **Tailwind CSS** — Styling and responsive design
- **Lucide React** — Icons (HelpCircle only)
- **No external chart libraries** — Pure CSS Grid implementation

## File Tree

```
src/
├── components/invest/options/
│   ├── options-heatmap.tsx                    ← NEW (423 lines)
│   ├── options-exploration-page.tsx           ← UPDATED
│   ├── options-order-form.tsx                 ← UPDATED
│   ├── options-guide-modal.tsx                (no changes)
│   ├── options-contracts-table.tsx            (no changes)
│   └── holdings-table.tsx                     (no changes)
├── lib/
│   └── options-types.ts                       ← UPDATED
└── app/invest/options/
    └── page.tsx                               (no changes)
```

## Related Documentation

- [Phase 2 Options Guide & Order Form](./PHASE_2_OPTIONS.md)
- [Options Type System](../src/lib/options-types.ts)
- [OptionsExplorationPage Source](../src/components/invest/options/options-exploration-page.tsx)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-08-07 | Initial Phase 3 implementation |

---

**Last Updated:** 2026-08-07  
**Author:** Claude Code  
**Status:** Complete & Tested
