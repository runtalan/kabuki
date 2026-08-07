# Collapsible Organize Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Organize" section header clickable to toggle visibility of Categories, Tags, and Auto-Tag Rules, reducing sidebar clutter while auto-expanding when relevant pages are active.

**Architecture:** Extend the existing collapse/expand logic in `SidebarContent` to detect the "Organize" section and render its header as an interactive button. Reuse the `manualOpen` state object and chevron rotation pattern already used for nav items with children.

**Tech Stack:** React, Next.js, lucide-react icons, Tailwind CSS

## Global Constraints

- Only the "Organize" section should be collapsible; other sections remain static
- Auto-expand when pathname matches `/categories`, `/tags`, or `/rules`
- Reuse existing state management (`manualOpen` object)
- Match existing collapse/expand UI (chevron rotation, hover styling, transitions)

---

### Task 1: Add helper function to detect if Organize section is active

**Files:**
- Modify: `src/components/sidebar.tsx:136-138`

**Interfaces:**
- Consumes: `pathname` (string from `usePathname()`)
- Produces: `isOrganizeSectionActive(pathname: string): boolean`

- [ ] **Step 1: Add the helper function**

After the `isChildActive` function (around line 138), add:

```typescript
function isOrganizeSectionActive(pathname: string) {
  const organizeRoutes = ['/categories', '/tags', '/rules'];
  return organizeRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/components/sidebar.tsx
git commit -m "feat: add helper to detect organize section active state"
```

---

### Task 2: Render Organize section header as clickable button

**Files:**
- Modify: `src/components/sidebar.tsx:180-184`

**Interfaces:**
- Consumes: `isOrganizeSectionActive()`, `manualOpen` state, `setManualOpen()`, `pathname`
- Produces: Modified section rendering that detects "Organize" and renders header differently

- [ ] **Step 1: Update section label rendering**

Find the section label rendering (around line 182):
```typescript
<p className="px-3 mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">
  {section.label}
</p>
```

Replace the section rendering logic inside `navSections.map()`. Before the `<ul>` that renders items, add logic to:
1. Detect if this is "Organize" section
2. Calculate if section should be open (manual toggle or auto-expand)
3. Render button instead of plain text for "Organize"
4. Wrap items in conditional render based on open state

Code to add (replace lines 180-263, the entire map function):

```typescript
{navSections.map((section) => {
  const sectionHasCollapsible = section.label === 'Organize';
  const sectionIsOpen = sectionHasCollapsible
    ? manualOpen[section.label] ?? isOrganizeSectionActive(pathname)
    : true;

  return (
    <div key={section.label} className="mb-5">
      {sectionHasCollapsible ? (
        <button
          type="button"
          onClick={() => setManualOpen((prev) => ({ ...prev, [section.label]: !sectionIsOpen }))}
          className="w-full flex items-center justify-between px-3 mb-2 py-1.5 rounded-lg text-[10.5px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground/60 transition-colors duration-200"
          aria-label={sectionIsOpen ? `Collapse ${section.label}` : `Expand ${section.label}`}
          aria-expanded={sectionIsOpen}
        >
          <span>{section.label}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${
              sectionIsOpen ? '' : '-rotate-90'
            }`}
          />
        </button>
      ) : (
        <p className="px-3 mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">
          {section.label}
        </p>
      )}

      {sectionIsOpen && (
        <ul className="space-y-0.5">
          {section.items.map((item) => {
            const Icon = item.icon;
            const isRootActive = pathname === item.href;
            const hasChildren = !!item.children?.length;
            const childActive =
              hasChildren && item.children!.some((c) => isChildActive(pathname, c));
            const sectionActive = isRootActive || childActive;
            const isOpen = hasChildren
              ? manualOpen[item.label] ?? sectionActive
              : false;

            return (
              <li key={item.href}>
                <div className="flex items-center gap-0.5">
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 min-w-0 ${
                      isRootActive
                        ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-semibold shadow-sm'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground font-medium'
                    }`}
                  >
                    <Icon
                      className={`w-[18px] h-[18px] flex-shrink-0 transition-colors duration-200 ${
                        isRootActive ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                  {hasChildren && (
                    <button
                      type="button"
                      onClick={() => setManualOpen((prev) => ({ ...prev, [item.label]: !isOpen }))}
                      className="p-2 rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-200 flex-shrink-0"
                      aria-label={isOpen ? `Collapse ${item.label}` : `Expand ${item.label}`}
                      aria-expanded={isOpen}
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
                      />
                    </button>
                  )}
                </div>

                {hasChildren && isOpen && (
                  <ul className="mt-0.5 mb-1 ml-[35px] pl-4 border-l border-sidebar-border/70 space-y-0.5">
                    {item.children!.map((child) => {
                      const active = isChildActive(pathname, child);
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            onClick={onNavigate}
                            className={`block px-3 py-1.5 rounded-lg text-sm transition-all duration-200 truncate ${
                              active
                                ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-semibold'
                                : 'text-muted-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground font-medium'
                            }`}
                          >
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
})}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/components/sidebar.tsx
git commit -m "feat: render organize section header as collapsible button"
```

---

### Task 3: Test collapsing and expanding

**Files:**
- Test: Manual browser testing (no automated tests needed for UI toggle)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Expected: Dev server starts, sidebar visible

- [ ] **Step 2: Test manual collapse**

- Click "Organize" section header
- Verify: Categories, Tags, Auto-Tag Rules items disappear
- Verify: Chevron rotates 90° (points right)
- Verify: Button has hover effect (background color changes)

- [ ] **Step 3: Test manual expand**

- Click "Organize" again
- Verify: Categories, Tags, Auto-Tag Rules items reappear
- Verify: Chevron rotates back to point down

- [ ] **Step 4: Test auto-expand on navigation**

- Close Organize (collapse it)
- Navigate to `/categories`
- Verify: "Organize" section automatically expands
- Navigate to `/spending`
- Navigate back to `/categories`
- Verify: Section stays in manually-set state (doesn't toggle again)

- [ ] **Step 5: Test other sections unaffected**

- Verify: "Track", "Properties", "Invest", "AI Orbit", "Platform" sections still show all items
- Verify: Their collapse/expand functionality for child items (Home → Net worth, etc.) still works

- [ ] **Step 6: Test mobile responsiveness**

- Open DevTools, toggle device toolbar (mobile view)
- Click menu icon to open drawer
- Click "Organize" to collapse
- Verify: items hide, chevron rotates
- Navigate to another page
- Verify: Drawer closes automatically (existing behavior)
- Re-open drawer
- Verify: Organize section state is remembered (collapsed or expanded)

- [ ] **Step 7: Stop dev server**

Run: `Ctrl+C`

---

### Task 4: Final validation and cleanup

**Files:**
- Verify: `src/components/sidebar.tsx`

- [ ] **Step 1: Code review checklist**

- Chevron icon imported (already at top, line 20)? ✓
- `isOrganizeSectionActive()` function defined? ✓
- "Organize" section header is button? ✓
- Click handler toggles state? ✓
- Items hide when closed? ✓
- Auto-expand logic works? ✓
- Other sections unaffected? ✓

- [ ] **Step 2: Run full build**

Run: `npm run build`
Expected: No errors, build succeeds

- [ ] **Step 3: Verify git log**

Run: `git log --oneline -5`
Verify the commits are present.

---

**Plan end. Next: superpowers:finishing-a-development-branch to complete work.**
