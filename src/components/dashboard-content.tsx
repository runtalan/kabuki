'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { CategoryIcon } from './category-icon';
import { DashboardGrid } from './dashboard-grid';
import { SpendCalendar } from './spend-calendar';
import { SpendingByCategoryWidget } from './spending-by-category-widget';
import { TopMerchantsWidget } from './top-merchants-widget';
import { CashFlowChart } from './charts/cash-flow-chart';
import { NetWorthChart } from './charts/net-worth-chart';
import { getTypeBadge } from '@/lib/account-types';
import { OWNERS } from './owner-badge';

const ACCOUNT_ICONS: Record<string, typeof Wallet> = { Wallet, CreditCard, PiggyBank, TrendingUp };

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  kind?: 'asset' | 'liability';
  owner?: string;
  icon?: string | null;
  mask?: string | null;
}

interface Transaction {
  id: string;
  name: string;
  amount: number;
  category: string;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  date: Date;
}

interface ChartData {
  month: string;
  income?: number;
  expenses?: number;
  savings?: number;
  netWorth?: number;
}

interface SpendingData {
  name: string;
  value: number;
  color: string;
}

interface DashboardContentProps {
  spendingByCategory: SpendingData[];
  cashFlowData: ChartData[];
  netWorthTrend: ChartData[];
  accounts: Account[];
  recentTransactions: Transaction[];
  stats: {
    netWorth: string;
    monthlyIncome: string;
    monthlyExpenses: string;
    savingsRate: string;
  };
}

export function DashboardContent({
  spendingByCategory,
  cashFlowData,
  netWorthTrend,
  accounts,
  recentTransactions,
  stats,
}: DashboardContentProps) {
  const dashboardItems = [
    {
      id: 'stats',
      type: 'stats' as const,
      title: 'Financial Overview',
      children: (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Net Worth Card */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 shadow-lg text-white hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-semibold text-blue-100 uppercase tracking-wide mb-2">
                  Net Worth
                </p>
                <p className="text-3xl font-bold">{stats.netWorth}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/20 backdrop-blur">
                <Wallet className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-100 font-medium">
              <TrendingUp className="w-4 h-4" />
              <span>+2.4% from last month</span>
            </div>
          </div>

          {/* Monthly Income Card */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-6 shadow-lg text-white hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wide mb-2">
                  Monthly Income
                </p>
                <p className="text-3xl font-bold">{stats.monthlyIncome}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/20 backdrop-blur">
                <ArrowDownLeft className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-emerald-100 font-medium">From all sources</p>
          </div>

          {/* Monthly Expenses Card */}
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-6 shadow-lg text-white hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-semibold text-red-100 uppercase tracking-wide mb-2">
                  Monthly Expenses
                </p>
                <p className="text-3xl font-bold">{stats.monthlyExpenses}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/20 backdrop-blur">
                <ArrowUpRight className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-red-100 font-medium">Total spend this month</p>
          </div>

          {/* Savings Rate Card */}
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 shadow-lg text-white hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-semibold text-purple-100 uppercase tracking-wide mb-2">
                  Savings Rate
                </p>
                <p className="text-3xl font-bold">{stats.savingsRate}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/20 backdrop-blur">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-purple-100 font-medium">Of income saved</p>
          </div>
        </div>
      ),
    },
    {
      id: 'calendar',
      type: 'calendar' as const,
      title: 'Spend Calendar',
      span: 'half' as const,
      children: <SpendCalendar bare />,
    },
    {
      id: 'spending',
      type: 'chart' as const,
      title: 'Spending by Category',
      span: 'half' as const,
      children: <SpendingByCategoryWidget />,
    },
    {
      id: 'top-merchants',
      type: 'chart' as const,
      title: 'Top 5 Merchants',
      span: 'half' as const,
      children: <TopMerchantsWidget />,
    },
    {
      id: 'cashflow',
      type: 'chart' as const,
      title: 'Cash Flow Trend',
      children: <CashFlowChart data={cashFlowData} />,
    },
    {
      id: 'networth',
      type: 'chart' as const,
      title: 'Net Worth Trend',
      children: <NetWorthChart data={netWorthTrend} />,
    },
    {
      id: 'accounts',
      type: 'accounts' as const,
      title: 'Linked Accounts',
      children: (
        <div className="space-y-3">
          {accounts.length > 0 ? (
            accounts.map((account) => {
              const badge = getTypeBadge(account);
              const Icon = ACCOUNT_ICONS[account.icon || ''] || Wallet;
              const ownerInfo = OWNERS[(account.owner as keyof typeof OWNERS) || 'joint'];
              return (
                <Link
                  key={account.id}
                  href={`/accounts/${account.id}`}
                  className="block p-4 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-border hover:border-primary/50 hover:from-muted/80 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="p-2 rounded-lg transition-colors"
                        style={{ backgroundColor: badge.color + '1a', color: badge.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{account.name}</p>
                        {account.mask && (
                          <p className="text-[11px] text-muted-foreground">••{account.mask}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: badge.color + '1a', color: badge.color }}
                      >
                        {badge.label}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: ownerInfo.color + '1a', color: ownerInfo.color }}
                      >
                        {ownerInfo.emoji} {ownerInfo.label}
                      </span>
                    </div>
                  </div>
                  <p
                    className={`text-lg font-semibold ml-9 ${
                      account.kind === 'liability' ? 'text-red-500' : 'text-primary'
                    }`}
                  >
                    {account.kind === 'liability' ? '-' : ''}$
                    {Math.abs(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </Link>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No accounts linked yet</p>
          )}
        </div>
      ),
    },
    {
      id: 'transactions',
      type: 'transactions' as const,
      title: 'Recent Transactions',
      children: (
        <div className="space-y-2">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/40 transition-all duration-200 border border-transparent hover:border-border"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`p-2.5 rounded-lg ${
                      tx.amount >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}
                  >
                    {tx.amount >= 0 ? (
                      <ArrowDownLeft
                        className={`w-5 h-5 ${
                          tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      />
                    ) : (
                      <ArrowUpRight
                        className={`w-5 h-5 ${
                          tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{tx.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CategoryIcon
                        icon={tx.categoryIcon}
                        color={tx.categoryColor}
                        className="w-3 h-3"
                      />
                      {tx.category}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold text-sm ${
                      tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {tx.amount >= 0 ? '+' : ''} ${Math.abs(tx.amount).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tx.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your financial overview.</p>
      </div>

      <DashboardGrid items={dashboardItems} />
    </div>
  );
}
