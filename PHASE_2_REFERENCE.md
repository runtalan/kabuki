# PHASE 2 Components - Quick Reference

## Component Relationships

```
┌─────────────────────────────────────────────────────────┐
│         OptionsExplorationPage (Main Page)              │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ HoldingsTable                                        ││
│  │ [Select ticker to show order form]                   ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ OptionsOrderForm (NEW - PHASE 2)                    ││
│  │                                                      ││
│  │  ┌──────────────────────────────────────────────┐  ││
│  │  │ Strategy Dropdown                  [?] ◄─────┼─ ││─┐
│  │  │ • Cash Secured Put                           │  ││ │
│  │  │ • Covered Call                               │  ││ │
│  │  │ • Buy to Call                                │  ││ │
│  │  └──────────────────────────────────────────────┘  ││ │
│  │                                                      ││ │
│  │  Ticker: AAPL                                       ││ │
│  │  Current Price: $195.50                             ││ │
│  │                                                      ││ │
│  │  Expiration Date: [    2026-09-21    ]  45 DTE     ││ │
│  │  Strike Price:   $[     195.00      ]              ││ │
│  │                                                      ││ │
│  │  Order Type: [Market ▼]                             ││ │
│  │  Limit Price: $[     1.50      ] (if limit)        ││ │
│  │                                                      ││ │
│  │  Quantity: [    1    ] contracts                    ││ │
│  │                                                      ││ │
│  │  ┌─────────────────────────────────────────────┐  ││ │
│  │  │ Total Premium:              $150.00         │  ││ │
│  │  │ Daily Income (if held):     $3.33           │  ││ │
│  │  └─────────────────────────────────────────────┘  ││ │
│  │                                                      ││ │
│  │  [        Place Order        ]                      ││ │
│  └─────────────────────────────────────────────────────┘│
│                                 │                        │
│  ┌──────────────────────────────┘                       │
│  │ (Optional: Heatmap coming Phase 3)                  │
│  │                                                      │
│  └─────────────────────────────────────────────────────┐
│                                                          │
└─────────────────────────────────────────────────────────┘
                       │
                       └─────┐
                             │
                    ┌────────▼──────────┐
                    │OptionsGuideModal  │◄─ Opens on [?] button
                    │ (Educational)     │
                    │                   │
                    │ The Greeks:       │
                    │  • Theta (θ)      │
                    │  • Gamma (Γ)      │
                    │                   │
                    │ DTE Strategy:     │
                    │  • 45 DTE         │
                    │  • 21 DTE         │
                    │  • 7 DTE          │
                    │                   │
                    │ Formulas:         │
                    │ • Total Premium   │
                    │ • Daily Income    │
                    │                   │
                    └───────────────────┘
```

## File Locations & Imports

### Main Page
```typescript
// src/app/invest/options/page.tsx (existing, integrates exploration page)
import { OptionsExplorationPage } from '@/components/invest/options/options-exploration-page';
```

### Exploration Page (Updated)
```typescript
// src/components/invest/options/options-exploration-page.tsx
import { OptionsOrderForm } from './options-order-form';
import type { OrderState } from '@/lib/options-types';

// Inside component:
<OptionsOrderForm
  ticker={selectedTicker}
  currentPrice={selectedHolding.currentPrice}
  onSubmit={handleOrderSubmit}
/>
```

### Order Form
```typescript
// src/components/invest/options/options-order-form.tsx
import { HelpCircle } from 'lucide-react';
import { OptionsGuideModal } from './options-guide-modal';
import type { OrderStrategy, OrderState, OrderType } from '@/lib/options-types';

// Manages internal state + renders guide modal
```

### Guide Modal
```typescript
// src/components/invest/options/options-guide-modal.tsx
import { X } from 'lucide-react';

// Pure presentational component
```

## Form State Shape

When submitted via `onSubmit`, the form sends:

```typescript
{
  strategy: "cash_secured_put" | "covered_call" | "buy_call",
  ticker: "AAPL",                              // from parent prop
  expiry: Date,                                // user selected date
  strike: 195.00,                              // user input
  orderType: "market" | "limit",               // user selected
  limitPrice: 1.50,                            // optional, if limit order
  quantity: 1,                                 // user input (contracts)
  
  // Optional fields for future use:
  estimatedPremium: 150.00,                    // limitPrice * 100 * quantity
  estimatedAnnualYield: undefined,             // TODO: calculate
  maxRisk: undefined,                          // TODO: calculate based on strategy
  maxProfit: undefined,                        // TODO: calculate based on strategy
  expiresIn: 45                                // TODO: calculate DTE
}
```

## Educational Content Breakdown

### The Greeks
| Greek | Formula/Meaning | Use Case |
|-------|-----------------|----------|
| **Theta (θ)** | Daily dollar decay | Income strategies benefit from theta |
| **Gamma (Γ)** | Delta acceleration | Risk inside 21 DTE; care with large moves |

### DTE Windows
| Window | Days Left | Status | Action |
|--------|-----------|--------|--------|
| **Sweet Spot** | ~45 | Entry optimal | Open new positions |
| **Exit Zone** | ~21 | Monitor closely | Close or roll positions |
| **High Risk** | <7 | Avoid | Don't open new positions |

### Key Formulas
```
Total Premium = Bid Price × 100
  → One option contract controls 100 shares

Daily Income = Total Premium ÷ DTE
  → Expected daily profit if held to expiration
```

## Component Props Summary

### OptionsOrderForm
```typescript
{
  ticker: string;                         // REQUIRED: Stock symbol
  currentPrice?: number;                  // OPTIONAL: Current stock price
  onSubmit?: (order: OrderState) => void; // OPTIONAL: Form submission handler
  isLoading?: boolean;                    // OPTIONAL: Loading state for button
}
```

### OptionsGuideModal
```typescript
{
  isOpen: boolean;                        // REQUIRED: Show/hide modal
  onClose: () => void;                    // REQUIRED: Close handler
}
```

## UI Patterns Used

### Input Fields
- All inputs follow consistent styling:
  - Border: `border-neutral-300 dark:border-neutral-700`
  - Background: `bg-white dark:bg-neutral-900`
  - Focus: `focus:ring-2 focus:ring-blue-500`
  - Text: `text-neutral-900 dark:text-white`

### Section Headers
- `text-2xl font-semibold text-neutral-900 dark:text-white`
- Appears above each major form section

### Information Boxes
- Blue boxes for calculations: `bg-blue-50 dark:bg-blue-950/20`
- Emerald boxes for entry zones: `bg-emerald-50 dark:bg-emerald-950/20`
- Amber boxes for warnings: `bg-amber-50 dark:bg-amber-950/20`
- Red boxes for risks: `bg-red-50 dark:bg-red-950/20`

### Icons
- Help/Info: `HelpCircle` from lucide-react (18px)
- Close: `X` from lucide-react (24px)
- All icons respect dark mode via Tailwind

## Integration Points for Future Phases

### Phase 3: Strike Heatmap
```typescript
// Update handleOrderSubmit to:
const handleOrderSubmit = (order: OrderState) => {
  // Filter available contracts by selected parameters
  const relevantContracts = availableContracts.filter(
    c => c.strike === order.strike && 
         c.expiry === order.expiry &&
         c.ticker === order.ticker
  );
  
  // Pass to heatmap component for visualization
  setHeatmapData(relevantContracts);
};
```

### Phase 4: API Integration
```typescript
// Update handleOrderSubmit to:
const handleOrderSubmit = async (order: OrderState) => {
  try {
    const response = await fetch('/api/orders/options', {
      method: 'POST',
      body: JSON.stringify(order),
    });
    const result = await response.json();
    // Show confirmation modal
    showConfirmation(result);
  } catch (error) {
    showError(error);
  }
};
```

## Dark Mode Testing

Components auto-switch based on `prefers-color-scheme`. Test by:
1. Open DevTools → Rendering → Emulate CSS media feature `prefers-color-scheme`
2. Or use browser dark mode setting

All colors explicitly defined with `dark:` variants for full coverage.

## Accessibility Checklist

✓ All form inputs have associated `<label>` elements with `htmlFor`  
✓ Buttons have `aria-label` attributes  
✓ Focus states visible with `focus:ring-2`  
✓ Modal has close button and backdrop click  
✓ Color not sole means of conveying information (text + color used)  
✓ Sufficient contrast ratios maintained  
✓ Form inputs properly disabled during submission  

## Performance Notes

- No external API calls in these components (yet)
- All calculations done in-browser instantly
- Date calculations use native JavaScript (no date library)
- Modal renders conditionally, doesn't pre-render
- Form state updates only on input change (controlled updates)
- No unnecessary re-renders due to proper hook usage

