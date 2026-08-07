# Collapsible Organize Section Design

**Date:** 2026-08-07  
**Goal:** Reduce visual clutter in the sidebar by making the "Organize" section collapsible

## Overview

The "Organize" section in the sidebar (Categories, Tags, Auto-Tag Rules) will become collapsible via the section header itself. This reduces visual noise while keeping the section accessible and auto-expanding when needed.

## Current State

- Sidebar has 6 sections: Track, Properties, Invest, AI Orbit, Organize, Platform
- Some nav items (Home, Spending, Properties, Invest, Fleet Command) already support expand/collapse for their children
- "Organize" has no parent item—it's just three flat items under a section label
- Section labels are currently static text

## Design

### Interaction Model

- **Organize section header** becomes clickable (button)
- **Chevron icon** appears next to "Organize" text to indicate collapsibility
- **Click behavior:** toggles open/closed state
- **Auto-expand:** section expands automatically if user navigates to `/categories`, `/tags`, or `/rules`
- **State persistence:** uses existing `manualOpen` state object keyed by section label ("Organize")

### Visual Behavior

- **Open state:** chevron points down (0° rotation), items visible
- **Closed state:** chevron rotates -90°, items hidden
- **Hover feedback:** section header has same hover styling as nav items (sidebar-accent background)
- **Click feedback:** instantaneous toggle with smooth transition

### Implementation Details

**State tracking:**
- Reuse the existing `manualOpen` state dictionary in `SidebarContent`
- Key: `"Organize"` (the section label)
- Value: boolean (true = open, false = closed)
- Default: `undefined` → follow active page behavior (auto-expand if section active)

**Active state detection:**
- Check if current pathname matches any Organize item:
  - `/categories`, `/tags`, `/rules`
  - Treat as "section active" to trigger auto-expand

**Styling:**
- Reuse existing CSS classes for button hover/click states
- Chevron uses same transition as existing collapse buttons (duration-200)
- Section header button uses `flex items-center gap-2` layout

### Code Location

**File:** `src/components/sidebar.tsx`

**Changes:**
1. Update section rendering logic (around line 180) to detect "Organize" section
2. Convert section label to button for "Organize" only
3. Add chevron icon next to "Organize" text
4. Wire up click handler to toggle `manualOpen["Organize"]`
5. Add logic to determine if section is active (any Organize item active)

## Testing

- Clicking "Organize" header toggles visibility of items
- Chevron rotates smoothly on toggle
- State persists during navigation within other sections
- Auto-expands when navigating to `/categories`, `/tags`, or `/rules`
- Hover shows sidebar-accent background
- Mobile experience: drawer closes after navigation, section state remembered on re-open

## Success Criteria

✓ "Organize" section can be collapsed/expanded via header click  
✓ Auto-expands when relevant page is active  
✓ Reduces visual clutter (3 items hidden when collapsed)  
✓ Consistent with existing collapse UI patterns  
✓ No new routes or data structure changes needed
