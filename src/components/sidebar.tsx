'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Home,
  Landmark,
  BarChart2,
  TrendingUp,
  Shapes,
  Wand2,
  Tags,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { ButtonsLogo } from './buttons-logo';

const USER_AVATARS: Record<string, string> = {
  renato: '👦',
  claudia: '👧',
};

interface NavChild {
  href: string;
  label: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  children?: NavChild[];
}

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: 'Track',
    items: [
      {
        href: '/home',
        label: 'Home',
        icon: Home,
        // Overview is the root (the "Home" link itself) — these are its
        // sub-pages, not a duplicate "Overview" entry.
        children: [
          { href: '/home/net-worth', label: 'Net worth' },
          { href: '/home/cash-flow', label: 'Cash flow' },
        ],
      },
      {
        href: '/spending',
        label: 'Spending',
        icon: BarChart2,
        children: [
          { href: '/spending/budget', label: 'Budget' },
          { href: '/spending/transactions', label: 'Transactions' },
          { href: '/spending/recurring', label: 'Recurring' },
        ],
      },
      { href: '/accounts', label: 'Accounts', icon: Landmark },
    ],
  },
  {
    label: 'Invest',
    items: [
      { href: '/invest', label: 'Holdings', icon: TrendingUp },
      { href: '/invest/options', label: 'Options', icon: TrendingUp },
      { href: '/invest/predictions', label: 'Predictions', icon: TrendingUp },
    ],
  },
  {
    label: 'Organize',
    items: [
      { href: '/categories', label: 'Categories', icon: Shapes },
      { href: '/tags', label: 'Tags', icon: Tags },
      { href: '/rules', label: 'Auto-Tag Rules', icon: Wand2 },
    ],
  },
  {
    label: 'Platform',
    items: [{ href: '/settings', label: 'Settings', icon: Settings }],
  },
];

function isChildActive(pathname: string, child: NavChild) {
  return pathname === child.href || pathname.startsWith(child.href + '/');
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);
  // Expand/collapse state per item label. Undefined = "follow the active
  // section automatically"; once the user manually toggles a section, that
  // choice sticks (open or closed) regardless of which page is active.
  const [manualOpen, setManualOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((session) => {
        const name = session?.user?.email || session?.user?.name;
        if (name) setUsername(name.toLowerCase());
      })
      .catch(() => {});
  }, []);

  const displayName = username
    ? username.charAt(0).toUpperCase() + username.slice(1)
    : null;
  const avatar = (username && USER_AVATARS[username]) || '👤';

  return (
    <div className="h-full bg-sidebar flex flex-col">
      {/* Header */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <ButtonsLogo className="w-9 h-9" />
          <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Buttons
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                // "Active page" (root) vs "active section" (a child is
                // open) are tracked separately so the parent row only gets
                // the bold/primary treatment when it's genuinely the page
                // you're on — not just because you're two levels deep in
                // one of its children.
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
                        className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all min-w-0 ${
                          isRootActive
                            ? 'bg-gradient-to-r from-primary/12 to-primary/5 text-primary font-semibold'
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground font-medium'
                        }`}
                      >
                        <Icon
                          className={`w-[18px] h-[18px] flex-shrink-0 ${
                            isRootActive ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                      {hasChildren && (
                        <button
                          type="button"
                          onClick={() => setManualOpen((prev) => ({ ...prev, [item.label]: !isOpen }))}
                          className="p-2 rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors flex-shrink-0"
                          aria-label={isOpen ? `Collapse ${item.label}` : `Expand ${item.label}`}
                          aria-expanded={isOpen}
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${isOpen ? '' : '-rotate-90'}`}
                          />
                        </button>
                      )}
                    </div>

                    {hasChildren && isOpen && (
                      <ul className="mt-0.5 mb-1 ml-[27px] pl-3 border-l border-sidebar-border space-y-0.5">
                        {item.children!.map((child) => {
                          const active = isChildActive(pathname, child);
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={onNavigate}
                                className={`block px-3 py-1.5 rounded-lg text-sm transition-all truncate ${
                                  active
                                    ? 'bg-gradient-to-r from-primary/12 to-primary/5 text-primary font-semibold'
                                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground font-medium'
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
          </div>
        ))}
      </nav>

      {/* Footer: user profile + sign out */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-muted/70 border border-border flex items-center justify-center text-base flex-shrink-0">
            {avatar}
          </div>
          <span className="flex-1 text-sm font-medium text-sidebar-foreground truncate">
            {displayName || '...'}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-2 rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all flex-shrink-0"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop: fixed full-height sidebar */}
      <aside className="hidden lg:block w-64 h-screen border-r border-sidebar-border fixed left-0 top-0">
        <SidebarContent />
      </aside>

      {/* Mobile: sticky top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <ButtonsLogo className="w-8 h-8" />
          <span
            className="text-base font-bold text-sidebar-foreground tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Buttons
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          aria-label="Open menu"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile: slide-over drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[80vw] shadow-2xl">
            <div className="relative h-full">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-5 p-1.5 rounded-lg text-muted-foreground hover:bg-sidebar-accent transition-colors z-10"
                aria-label="Close menu"
                title="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
