'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface PageTab {
  href: string;
  label: string;
}

// Pill-style sub-navigation shown under a section's page title (Home:
// Overview / Net worth, Spending: Overview / Budget / ...). The active tab
// matches exactly so index tabs ("/spending") don't stay lit on sub-pages.
export function PageTabs({ tabs }: { tabs: PageTab[] }) {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
              isActive
                ? 'bg-muted text-foreground font-semibold border border-border shadow-sm'
                : 'text-muted-foreground hover:text-foreground font-medium'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

export const HOME_TABS: PageTab[] = [
  { href: '/home', label: 'Overview' },
  { href: '/home/net-worth', label: 'Net worth' },
  { href: '/home/cash-flow', label: 'Cash flow' },
];

export const SPENDING_TABS: PageTab[] = [
  { href: '/spending', label: 'Overview' },
  { href: '/spending/budget', label: 'Budget' },
  { href: '/spending/transactions', label: 'Transactions' },
  { href: '/spending/recurring', label: 'Recurring' },
];

export const PROPERTIES_TABS: PageTab[] = [
  { href: '/properties', label: 'Overview' },
  { href: '/properties/manage', label: 'Manage' },
  { href: '/properties/pay-ahead', label: 'Pay-Ahead Calculator' },
  { href: '/properties/loan-calculator', label: 'Loan Calculator' },
];

export const INVEST_TABS: PageTab[] = [
  { href: '/invest', label: 'Holdings' },
  { href: '/invest/stocks', label: 'Trade Stocks' },
  { href: '/invest/options', label: 'Options' },
  { href: '/invest/watchlist', label: 'Watch List' },
  { href: '/invest/predictions', label: 'Predictions' },
];
