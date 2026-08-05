'use client';

import { useState } from 'react';
import { Home, TrendingUp, Wallet, Tag, FilePenLine, ChevronDown } from 'lucide-react';

type Section = 'home' | 'spending' | 'transactions' | 'accounts' | 'categories' | 'tags' | 'rules';

// Hardcoded fake data
const FAKE_TRANSACTIONS = [
  { id: 1, date: 'Jul 27', merchant: 'United Airlines', category: 'Travel', amount: '-$500.00', icon: '✈️' },
  { id: 2, date: 'Jul 25', merchant: 'Uber', category: 'Transport', amount: '-$6.33', icon: '🚗' },
  { id: 3, date: 'Jul 22', merchant: 'Tectra Inc', category: 'Uncategorized', amount: '-$500.00', icon: '📋' },
  { id: 4, date: 'Jul 21', merchant: 'AUTOMATIC PAYMENT - THANK', category: 'Uncategorized', amount: '-$2,078.50', icon: '🤖' },
  { id: 5, date: 'Jul 21', merchant: 'KFC', category: 'Dining', amount: '-$500.00', icon: '🍗' },
  { id: 6, date: 'Jul 20', merchant: 'Whole Foods', category: 'Groceries', amount: '-$124.32', icon: '🛒' },
  { id: 7, date: 'Jul 19', merchant: 'Spotify', category: 'Subscription', amount: '-$14.99', icon: '🎵' },
  { id: 8, date: 'Jul 18', merchant: 'Netflix', category: 'Entertainment', amount: '-$15.99', icon: '🎬' },
];

const FAKE_SPENDING_DATA = {
  thisMonth: '$11,720.14',
  lastMonth: '$9,240.50',
  average: '$10,320.32',
  categories: [
    { name: 'Dining', amount: '$2,340', pct: 20, icon: '🍽️' },
    { name: 'Travel', amount: '$3,500', pct: 30, icon: '✈️' },
    { name: 'Groceries', amount: '$1,840', pct: 15.7, icon: '🛒' },
    { name: 'Utilities', amount: '$2,100', pct: 17.9, icon: '💡' },
    { name: 'Entertainment', amount: '$1,540', pct: 13.1, icon: '🎬' },
  ],
  topMerchants: [
    { rank: 1, name: 'United Airlines', amount: '$500', icon: '✈️' },
    { rank: 2, name: 'KFC', amount: '$500', icon: '🍗' },
    { rank: 3, name: 'Spotify', amount: '$14.99', icon: '🎵' },
    { rank: 4, name: 'Whole Foods', amount: '$124.32', icon: '🛒' },
    { rank: 5, name: 'Netflix', amount: '$15.99', icon: '🎬' },
  ],
};

export function InteractiveAppDemo() {
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [activeSubSection, setActiveSubSection] = useState<string>('overview');

  const sections: Record<Section, { label: string; icon: React.ComponentType<any>; subsections?: string[] }> = {
    home: {
      label: 'Home',
      icon: Home,
      subsections: ['Overview', 'Net worth'],
    },
    spending: {
      label: 'Spending',
      icon: TrendingUp,
      subsections: ['Overview', 'Budget', 'Transactions', 'Recurring'],
    },
    transactions: {
      label: 'Transactions',
      icon: TrendingUp,
    },
    accounts: {
      label: 'Accounts',
      icon: Wallet,
    },
    categories: {
      label: 'Categories',
      icon: Tag,
    },
    tags: {
      label: 'Tags',
      icon: Tag,
    },
    rules: {
      label: 'Auto-Tag Rules',
      icon: FilePenLine,
    },
  };

  const handleSectionClick = (section: Section) => {
    setActiveSection(section);
    const subsections = sections[section].subsections;
    if (subsections) {
      setActiveSubSection(subsections[0].toLowerCase());
    }
  };

  const renderContent = () => {
    if (activeSection === 'home' && activeSubSection === 'overview') {
      return (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-4 border-b border-border">
            <button className="px-4 py-3 text-sm font-medium text-foreground border-b-2 border-foreground">
              Overview
            </button>
            <button
              onClick={() => setActiveSubSection('net worth')}
              className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Net worth
            </button>
          </div>

          {/* Net Worth Card */}
          <div className="rounded-lg border border-border p-6 bg-card">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">NET WORTH</p>
            <p className="text-5xl font-bold text-foreground">-$40,452</p>
            <p className="text-xs text-muted-foreground mt-3">Building history — deltas appear after a month of syncs</p>
            <p className="text-sm text-primary mt-4 cursor-pointer">View full net worth →</p>
          </div>

          {/* Grid: Calendar + Cash Flow + Accounts */}
          <div className="grid grid-cols-2 gap-6">
            {/* Calendar */}
            <div className="rounded-lg border border-border p-6 bg-card">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">SPENT IN JULY</p>
                  <p className="text-3xl font-bold text-foreground">$11.1K</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <button className="text-primary font-medium">Month</button>
                  <span className="mx-2">•</span>
                  <button className="text-muted-foreground hover:text-foreground">Week</button>
                </div>
              </div>

              {/* Mini calendar */}
              <div className="grid grid-cols-7 gap-1 text-xs text-center">
                {[...Array(31)].map((_, i) => {
                  const day = i + 1;
                  const isToday = day === 11;
                  const isWeekend = (i % 7) > 4;

                  return (
                    <div
                      key={day}
                      className={`h-6 flex items-center justify-center rounded text-xs font-medium ${
                        isToday
                          ? 'bg-red-500 text-white'
                          : isWeekend
                            ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                            : 'text-foreground'
                      }`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-4 mt-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">Spent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Made</span>
                </div>
              </div>
            </div>

            {/* Accounts Sidebar */}
            <div className="rounded-lg border border-border p-6 bg-card">
              <div className="flex justify-between items-center mb-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">ACCOUNTS</p>
                <button className="text-primary text-xs font-semibold">Manage</button>
              </div>

              <div className="space-y-3">
                {[
                  { icon: '🏦', name: 'Plaid Checking', masked: 'checking ••0000', emoji: '😄', balance: '$110' },
                  { icon: '💰', name: 'Plaid Saving', masked: 'savings •••111', emoji: '😊', balance: '$210' },
                  { icon: '📊', name: 'Plaid CD', masked: 'cd ••2222', emoji: '😁', balance: '$1,000' },
                  { icon: '💳', name: 'Plaid Credit C...', masked: 'credit card ••3333', emoji: '😞', balance: '-$410' },
                ].map((acc) => (
                  <div key={acc.name} className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0">
                    <div className="text-lg mt-1">{acc.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{acc.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{acc.masked}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-foreground">{acc.balance}</p>
                      <p className="text-sm">{acc.emoji}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cash Flow & Recent Activity */}
          <div className="grid grid-cols-2 gap-6">
            {/* Cash Flow */}
            <div className="rounded-lg border border-border p-6 bg-card">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4">
                CASH FLOW THIS MONTH
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-lg">📈</div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Income</p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-600">+$0</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-lg">📉</div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Expenses</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">-$0</p>
                </div>

                <div className="border-t border-border pt-4 flex justify-between">
                  <p className="text-xs text-muted-foreground">Net this month</p>
                  <p className="text-sm font-semibold text-emerald-600">+$0</p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-lg border border-border p-6 bg-card">
              <div className="flex justify-between items-center mb-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">RECENT ACTIVITY</p>
                <button className="text-primary text-xs font-semibold">View all</button>
              </div>

              <div className="space-y-3">
                {[
                  { icon: '✈️', name: 'United Airlines', category: 'Travel', date: 'Jul 27', amount: '-$500.00' },
                  { icon: '🚗', name: 'Uber', category: 'Transport', date: 'Jul 25', amount: '-$6.33' },
                  { icon: '📋', name: 'Tectra Inc', category: 'Uncategorized', date: 'Jul 22', amount: '-$500.00' },
                  { icon: '🤖', name: 'AUTOMATIC PAYMENT - THANK', category: 'Uncategorized', date: 'Jul 21', amount: '-$2,078.50' },
                  { icon: '🍗', name: 'KFC', category: 'Dining', date: 'Jul 21', amount: '-$500.00' },
                ].map((tx, i) => (
                  <div key={i} className="flex items-center gap-3 pb-3 border-b border-border/50 last:border-0">
                    <div className="text-lg">{tx.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{tx.name}</p>
                      <p className="text-xs text-muted-foreground">{tx.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-foreground font-semibold">{tx.amount}</p>
                      <p className="text-xs text-muted-foreground">{tx.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === 'spending' && activeSubSection === 'overview') {
      return (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-6 border-b border-border">
            <button className="px-0 py-3 text-sm font-medium text-foreground border-b-2 border-foreground pb-3">
              Overview
            </button>
            <button className="px-0 py-3 text-sm font-medium text-muted-foreground hover:text-foreground pb-3">
              Budget
            </button>
            <button className="px-0 py-3 text-sm font-medium text-muted-foreground hover:text-foreground pb-3">
              Transactions
            </button>
            <button className="px-0 py-3 text-sm font-medium text-muted-foreground hover:text-foreground pb-3">
              Recurring
            </button>
          </div>

          {/* Spending Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-border p-4 bg-card">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Spent This Month</p>
              <p className="text-2xl font-bold text-foreground">{FAKE_SPENDING_DATA.thisMonth}</p>
              <p className="text-xs text-muted-foreground mt-2">vs ${FAKE_SPENDING_DATA.lastMonth.slice(1)} last month</p>
            </div>
            <div className="rounded-lg border border-border p-4 bg-card">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Monthly Average</p>
              <p className="text-2xl font-bold text-foreground">{FAKE_SPENDING_DATA.average}</p>
              <p className="text-xs text-muted-foreground mt-2">Based on 3 months</p>
            </div>
            <div className="rounded-lg border border-border p-4 bg-card">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Pace This Month</p>
              <p className="text-2xl font-bold text-red-600">+$2,480</p>
              <p className="text-xs text-muted-foreground mt-2">Trending higher</p>
            </div>
          </div>

          {/* Category Breakdown & Top Merchants */}
          <div className="grid grid-cols-2 gap-6">
            {/* Spending by Category */}
            <div className="rounded-lg border border-border p-6 bg-card">
              <p className="text-sm font-semibold text-muted-foreground mb-4">Spending by Category</p>
              <div className="space-y-3">
                {FAKE_SPENDING_DATA.categories.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-3">
                    <span className="text-lg">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">{cat.name}</span>
                        <span className="text-xs text-muted-foreground">{cat.pct}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-primary to-accent h-2 rounded-full"
                          style={{ width: `${cat.pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-foreground w-16 text-right">{cat.amount}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Merchants */}
            <div className="rounded-lg border border-border p-6 bg-card">
              <p className="text-sm font-semibold text-muted-foreground mb-4">Top Merchants</p>
              <div className="space-y-3">
                {FAKE_SPENDING_DATA.topMerchants.map((m) => (
                  <div key={m.rank} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {m.rank}
                    </div>
                    <span className="text-lg">{m.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{m.name}</p>
                    </div>
                    <span className="text-xs font-semibold text-foreground">{m.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === 'transactions') {
      return (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-foreground">Transactions</h1>

          {/* Filter Bar */}
          <div className="flex gap-2 flex-wrap">
            <button className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
              All
            </button>
            <button className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80">
              Travel
            </button>
            <button className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80">
              Dining
            </button>
            <button className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80">
              Groceries
            </button>
          </div>

          {/* Transactions Table */}
          <div className="rounded-lg border border-border overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground text-xs">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground text-xs">Merchant</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground text-xs">Category</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Amount</th>
                </tr>
              </thead>
              <tbody>
                {FAKE_TRANSACTIONS.map((tx, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/20 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{tx.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{tx.icon}</span>
                        <span className="text-xs font-medium text-foreground">{tx.merchant}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{tx.category}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-foreground">{tx.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center text-muted-foreground py-12">
        <p className="text-sm">Section preview not available</p>
      </div>
    );
  };

  return (
    <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
      {/* Fake window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/40">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5">
        {/* Sidebar */}
        <div className="md:col-span-1 border-r border-border bg-muted/30 p-4 space-y-1">
          {Object.entries(sections).map(([key, section]) => {
            const Icon = section.icon;
            const isActive = activeSection === (key as Section);

            return (
              <button
                key={key}
                onClick={() => handleSectionClick(key as Section)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-left text-xs">{section.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="md:col-span-4 p-6 overflow-y-auto max-h-[700px] bg-background">
          <div>
            {activeSection !== 'transactions' && (
              <h1 className="text-3xl font-bold text-foreground mb-6">
                {activeSection === 'home' ? 'Home' : 'Spending'}
              </h1>
            )}
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
