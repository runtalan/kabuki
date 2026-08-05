'use client';

import { useState } from 'react';
import {
  Home,
  TrendingUp,
  Wallet,
  Tag,
  Settings,
  ChevronDown,
} from 'lucide-react';

type Section = 'home' | 'spending' | 'accounts' | 'categories' | 'tags' | 'settings';
type SubSection = string;

export function InteractiveAppDemo() {
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [expandedSection, setExpandedSection] = useState<Section | null>('home');
  const [activeSubSection, setActiveSubSection] = useState<SubSection>('overview');

  const sections = {
    home: {
      label: 'Home',
      icon: Home,
      subsections: ['Overview', 'Net Worth'],
    },
    spending: {
      label: 'Spending',
      icon: TrendingUp,
      subsections: ['Overview', 'Budget', 'Transactions', 'Recurring'],
    },
    accounts: {
      label: 'Accounts',
      icon: Wallet,
      subsections: [],
    },
    categories: {
      label: 'Categories',
      icon: Tag,
      subsections: [],
    },
    tags: {
      label: 'Tags',
      icon: Tag,
      subsections: [],
    },
    settings: {
      label: 'Settings',
      icon: Settings,
      subsections: [],
    },
  };

  const handleSectionClick = (section: Section) => {
    setActiveSection(section);
    if (sections[section].subsections.length > 0) {
      setExpandedSection(expandedSection === section ? null : section);
      setActiveSubSection(sections[section].subsections[0].toLowerCase());
    }
  };

  const renderContent = () => {
    if (activeSection === 'home' && activeSubSection === 'overview') {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Home Overview</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white">
                <p className="text-xs uppercase tracking-wide text-blue-100 mb-2">
                  Net Worth
                </p>
                <p className="text-2xl font-bold">$287,402</p>
                <p className="text-xs text-blue-200 mt-2">+$12,400 this month</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-4 text-white">
                <p className="text-xs uppercase tracking-wide text-emerald-100 mb-2">
                  Income
                </p>
                <p className="text-2xl font-bold">$14,200</p>
                <p className="text-xs text-emerald-200 mt-2">This month</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 p-4 text-white">
                <p className="text-xs uppercase tracking-wide text-purple-100 mb-2">
                  Expenses
                </p>
                <p className="text-2xl font-bold">$8,600</p>
                <p className="text-xs text-purple-200 mt-2">39% of income</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border p-6 bg-card">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
              Spending by Category
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Groceries', amount: '$1,240', pct: 14.4 },
                { name: 'Dining', amount: '$1,080', pct: 12.5 },
                { name: 'Transport', amount: '$680', pct: 7.9 },
                { name: 'Entertainment', amount: '$520', pct: 6 },
                { name: 'Utilities', amount: '$1,950', pct: 22.6 },
              ].map((cat) => (
                <div key={cat.name} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {cat.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{cat.amount}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-primary to-accent h-2 rounded-full"
                        style={{ width: `${cat.pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border p-6 bg-card">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
              Recent Activity
            </h3>
            <div className="space-y-3">
              {[
                { desc: 'Whole Foods Market', amt: '-$124.32', cat: 'Groceries' },
                { desc: 'United Airlines', amt: '-$680.00', cat: 'Travel' },
                { desc: 'Salary Deposit', amt: '+$7,200.00', cat: 'Income' },
                { desc: 'Spotify Subscription', amt: '-$14.99', cat: 'Subscription' },
              ].map((tx, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{tx.desc}</p>
                    <p className="text-xs text-muted-foreground">{tx.cat}</p>
                  </div>
                  <span
                    className={`font-semibold ${
                      tx.amt.startsWith('+')
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-foreground'
                    }`}
                  >
                    {tx.amt}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === 'home' && activeSubSection === 'net worth') {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Net Worth Trend</h2>
          <div className="rounded-xl border border-border p-6 bg-card">
            <div className="text-center mb-8">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Total Net Worth
              </p>
              <p className="text-5xl font-bold text-foreground">$287,402</p>
              <p className="text-sm text-emerald-600 mt-2">+$24,800 (9.4%) from last month</p>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Assets</h4>
                <div className="space-y-2">
                  {[
                    { name: 'Checking', value: '$42,300' },
                    { name: 'Savings', value: '$85,000' },
                    { name: 'Investments', value: '$156,000' },
                  ].map((asset) => (
                    <div key={asset.name} className="flex justify-between text-sm">
                      <span className="text-foreground">{asset.name}</span>
                      <span className="font-medium text-foreground">{asset.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">Liabilities</h4>
                <div className="space-y-2">
                  {[{ name: 'Credit Card Balance', value: '-$3,898' }].map((liability) => (
                    <div key={liability.name} className="flex justify-between text-sm">
                      <span className="text-foreground">{liability.name}</span>
                      <span className="font-medium text-red-600">{liability.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === 'spending' && activeSubSection === 'overview') {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Spending Overview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-4 bg-card">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                Spent This Month
              </p>
              <p className="text-3xl font-bold text-foreground">$8,642</p>
              <p className="text-xs text-muted-foreground mt-2">$1,245 more than last month</p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-card">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                Monthly Average
              </p>
              <p className="text-3xl font-bold text-foreground">$8,124</p>
              <p className="text-xs text-muted-foreground mt-2">Based on 3 months</p>
            </div>
          </div>
          <div className="rounded-xl border border-border p-6 bg-card">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
              Top Merchants
            </h3>
            <div className="space-y-3">
              {[
                { rank: 1, name: 'Whole Foods Market', amount: '$480', cat: '🛒' },
                { rank: 2, name: 'United Airlines', amount: '$350', cat: '✈️' },
                { rank: 3, name: 'Spotify', amount: '$15', cat: '🎵' },
                { rank: 4, name: 'Chipotle', amount: '$145', cat: '🍜' },
                { rank: 5, name: 'Tesla Supercharger', amount: '$62', cat: '⚡' },
              ].map((m) => (
                <div key={m.rank} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {m.rank}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                  </div>
                  <span className="font-semibold text-foreground">{m.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === 'spending' && activeSubSection === 'budget') {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Monthly Budgets</h2>
          <div className="rounded-xl border border-border p-6 bg-card">
            <div className="space-y-4">
              {[
                { cat: 'Groceries', budget: '$1,500', spent: '$1,240', pct: 82.7, status: 'good' },
                { cat: 'Dining', budget: '$1,200', spent: '$1,080', pct: 90, status: 'warning' },
                { cat: 'Transport', budget: '$800', spent: '$680', pct: 85, status: 'good' },
                { cat: 'Entertainment', budget: '$600', spent: '$520', pct: 86.7, status: 'warning' },
              ].map((b) => (
                <div key={b.cat} className="pb-4 border-b border-border last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-foreground">{b.cat}</h4>
                    <span className="text-xs text-muted-foreground">{b.spent} of {b.budget}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        b.status === 'good'
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(b.pct, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{b.pct}% of budget</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === 'spending' && activeSubSection === 'transactions') {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Transactions</h2>
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Merchant</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Category</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { date: 'Aug 3', merchant: 'Whole Foods Market', cat: 'Groceries', amt: '-$124.32' },
                  { date: 'Aug 2', merchant: 'United Airlines', cat: 'Travel', amt: '-$680.00' },
                  { date: 'Aug 1', merchant: 'Salary Deposit', cat: 'Income', amt: '+$7,200.00' },
                  { date: 'Jul 31', merchant: 'Spotify Subscription', cat: 'Subscription', amt: '-$14.99' },
                  { date: 'Jul 30', merchant: 'Chipotle', cat: 'Dining', amt: '-$18.50' },
                ].map((tx, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/20 cursor-pointer">
                    <td className="px-4 py-3 text-muted-foreground">{tx.date}</td>
                    <td className="px-4 py-3 text-foreground font-medium">{tx.merchant}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{tx.cat}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${
                      tx.amt.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                    }`}>{tx.amt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (activeSection === 'spending' && activeSubSection === 'recurring') {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Recurring Charges</h2>
          <div className="space-y-3">
            {[
              { name: 'Spotify Premium', amount: '$14.99', freq: 'Monthly', next: 'Aug 10' },
              { name: 'Netflix', amount: '$15.99', freq: 'Monthly', next: 'Aug 15' },
              { name: 'AWS Hosting', amount: '$45.00', freq: 'Monthly', next: 'Aug 5' },
              { name: 'Adobe Creative Cloud', amount: '$64.99', freq: 'Monthly', next: 'Aug 12' },
            ].map((r) => (
              <div
                key={r.name}
                className="rounded-xl border border-border p-4 bg-card hover:bg-muted/20 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-foreground">{r.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{r.freq} • Next: {r.next}</p>
                  </div>
                  <span className="font-semibold text-foreground">{r.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeSection === 'accounts') {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Connected Accounts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'Chase Checking', owner: 'Renato', balance: '$12,400', type: 'Checking' },
              { name: 'Chase Savings', owner: 'Claudia', balance: '$45,680', type: 'Savings' },
              { name: 'Fidelity Brokerage', owner: 'Joint', balance: '$156,200', type: 'Investment' },
              { name: 'Amex Card', owner: 'Renato', balance: '-$3,898', type: 'Credit' },
            ].map((acc) => (
              <div
                key={acc.name}
                className="rounded-xl border border-border p-6 bg-gradient-to-br from-card to-primary/5"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-foreground">{acc.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{acc.type} • {acc.owner}</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{acc.balance}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeSection === 'categories') {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: '🛒', name: 'Groceries', spent: '$1,240', budget: '$1,500' },
              { icon: '🍜', name: 'Dining', spent: '$1,080', budget: '$1,200' },
              { icon: '⚡', name: 'Transport', spent: '$680', budget: '$800' },
              { icon: '🎬', name: 'Entertainment', spent: '$520', budget: '$600' },
              { icon: '💡', name: 'Utilities', spent: '$450', budget: '$500' },
              { icon: '🏥', name: 'Healthcare', spent: '$200', budget: '$300' },
            ].map((cat) => (
              <div
                key={cat.name}
                className="rounded-lg border border-border p-4 bg-card hover:bg-muted/20 cursor-pointer transition-colors"
              >
                <div className="text-2xl mb-2">{cat.icon}</div>
                <h4 className="font-medium text-foreground text-sm">{cat.name}</h4>
                <p className="text-xs text-muted-foreground mt-2">{cat.spent} spent</p>
                <p className="text-xs text-muted-foreground">Budget: {cat.budget}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeSection === 'tags') {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {[
              'Travel',
              'Work Expenses',
              'Recurring',
              'Shared',
              'Personal',
              'Investment',
              'Business',
            ].map((tag) => (
              <div
                key={tag}
                className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 cursor-pointer transition-colors"
              >
                #{tag}
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border p-6 bg-card text-center text-muted-foreground">
            <p>Click any tag to view tagged transactions</p>
          </div>
        </div>
      );
    }

    if (activeSection === 'settings') {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-6 bg-card">
              <h3 className="font-semibold text-foreground mb-4">Account Settings</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-foreground">Email</span>
                  <span className="text-sm text-muted-foreground">renato@example.com</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-foreground">Two-Factor Auth</span>
                  <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-700 rounded-full">
                    Enabled
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-foreground">Theme</span>
                  <span className="text-sm text-muted-foreground">System</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border p-6 bg-card">
              <h3 className="font-semibold text-foreground mb-4">Plaid Integration</h3>
              <p className="text-sm text-muted-foreground mb-4">
                4 accounts connected and syncing automatically
              </p>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                Reconnect Plaid
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
      {/* Fake window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/40">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 min-h-[600px]">
        {/* Sidebar */}
        <div className="md:col-span-1 border-r border-border bg-muted/30 p-4 space-y-2">
          {Object.entries(sections).map(([key, section]) => {
            const Icon = section.icon;
            const isActive = activeSection === (key as Section);
            const isExpanded = expandedSection === (key as Section);
            const hasSubsections = section.subsections.length > 0;

            return (
              <div key={key}>
                <button
                  onClick={() => handleSectionClick(key as Section)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{section.label}</span>
                  {hasSubsections && (
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>

                {isExpanded &&
                  hasSubsections &&
                  section.subsections.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setActiveSubSection(sub.toLowerCase())}
                      className={`w-full text-left px-3 py-2 ml-4 rounded-lg text-xs font-medium transition-colors ${
                        activeSubSection === sub.toLowerCase()
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
              </div>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="md:col-span-4 p-6 overflow-y-auto max-h-[600px]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
