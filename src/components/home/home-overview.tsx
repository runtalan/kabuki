'use client';

import Link from 'next/link';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Wallet,
  CreditCard,
  PiggyBank,
} from 'lucide-react';
import { CategoryIcon } from '@/components/category-icon';
import { SpendCalendar } from '@/components/spend-calendar';
import { getTypeBadge } from '@/lib/account-types';
import { OWNERS } from '@/components/owner-badge';

const ACCOUNT_ICONS: Record<string, typeof Wallet> = { Wallet, CreditCard, PiggyBank, TrendingUp };

interface NetWorthPoint {
  date: string;
  iso: string;
  netWorth: number;
}

interface CashFlowMonth {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

interface AccountInfo {
  id: string;
  name: string;
  type: string;
  subtype?: string | null;
  balance: number;
  kind: 'asset' | 'liability';
  owner?: string;
  icon?: string | null;
  mask?: string | null;
  liabilityType?: string | null;
  assetType?: string | null;
}

interface RecentTransaction {
  id: string;
  name: string;
  merchant: string;
  category: string;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  amount: number;
  date: string;
}

function money(value: number, decimals = 0) {
  return `$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function HomeOverview({
  netWorthSeries,
  cashFlowData,
  accounts,
  recentTransactions,
}: {
  netWorthSeries: NetWorthPoint[];
  cashFlowData: CashFlowMonth[];
  accounts: AccountInfo[];
  recentTransactions: RecentTransaction[];
}) {
  const netWorth = accounts.reduce(
    (sum, acc) => sum + (acc.kind === 'liability' ? -acc.balance : acc.balance),
    0
  );

  const latest = netWorthSeries[netWorthSeries.length - 1];
  const monthAgo =
    netWorthSeries.length > 1
      ? netWorthSeries[Math.max(0, netWorthSeries.length - 31)]
      : null;
  const delta =
    latest && monthAgo && monthAgo.netWorth !== 0
      ? {
          dollars: latest.netWorth - monthAgo.netWorth,
          pct: ((latest.netWorth - monthAgo.netWorth) / Math.abs(monthAgo.netWorth)) * 100,
        }
      : null;

  const currentMonth = cashFlowData[cashFlowData.length - 1] || {
    income: 0,
    expenses: 0,
    savings: 0,
  };
  const cashFlowMax = Math.max(currentMonth.income, currentMonth.expenses, 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column: net worth + cash flow + recent activity */}
      <div className="lg:col-span-2 space-y-6">
        {/* Net Worth Summary */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
            Net Worth
          </p>
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <p className="text-4xl font-bold text-foreground">
                {netWorth < 0 && '-'}
                {money(netWorth)}
              </p>
              {delta ? (
                <p
                  className={`mt-2 inline-flex items-center gap-1.5 text-sm font-semibold ${
                    delta.dollars >= 0 ? 'text-emerald-500' : 'text-red-500'
                  }`}
                >
                  {delta.dollars >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {delta.dollars >= 0 ? '+' : '-'}
                  {money(delta.dollars)} ({delta.pct >= 0 ? '+' : ''}
                  {delta.pct.toFixed(1)}%) past month
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Building history — deltas appear after a month of syncs
                </p>
              )}
            </div>
            <div className="w-full sm:w-64 h-20">
              {netWorthSeries.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={netWorthSeries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sparkNetWorth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="netWorth"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#sparkNetWorth)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No trend yet
                </div>
              )}
            </div>
          </div>
          <Link
            href="/home/net-worth"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            View full net worth →
          </Link>
        </div>

        {/* Cash Flow */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
            Cash Flow This Month
          </p>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-500" /> Income
                </span>
                <span className="text-sm font-semibold text-emerald-500">
                  +{money(currentMonth.income)}
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${(currentMonth.income / cashFlowMax) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-red-500" /> Expenses
                </span>
                <span className="text-sm font-semibold text-red-500">
                  -{money(currentMonth.expenses)}
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-500 transition-all"
                  style={{ width: `${(currentMonth.expenses / cashFlowMax) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-sm text-muted-foreground">Net this month</span>
              <span
                className={`text-sm font-bold ${
                  currentMonth.savings >= 0 ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {currentMonth.savings >= 0 ? '+' : '-'}
                {money(currentMonth.savings)}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Recent Activity
            </p>
            <Link
              href="/spending/transactions"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-1">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: (tx.categoryColor || '#6b7280') + '22' }}
                    >
                      <CategoryIcon
                        icon={tx.categoryIcon}
                        color={tx.categoryColor}
                        className="w-4 h-4"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tx.merchant}</p>
                      <p className="text-xs text-muted-foreground">{tx.category}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p
                      className={`text-sm font-semibold ${
                        tx.amount >= 0 ? 'text-emerald-500' : 'text-foreground'
                      }`}
                    >
                      {tx.amount >= 0 ? '+' : '-'}
                      {money(tx.amount, 2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground px-3 py-6 text-center">
                No transactions yet — link an account to see activity here.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right column: spend calendar + quick account balances */}
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-2xl p-6">
          <SpendCalendar bare />
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Accounts
            </p>
            <Link href="/accounts" className="text-sm font-medium text-primary hover:underline">
              Manage
            </Link>
          </div>
          <div className="space-y-2">
            {accounts.length > 0 ? (
              accounts.map((account) => {
                const badge = getTypeBadge(account);
                const Icon = ACCOUNT_ICONS[account.icon || ''] || Wallet;
                const ownerInfo = OWNERS[(account.owner as keyof typeof OWNERS) || 'joint'];
                return (
                  <Link
                    key={account.id}
                    href={`/accounts/${account.id}`}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/40 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: badge.color + '1a', color: badge.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {account.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {badge.label}
                          {account.mask && ` ••${account.mask}`}
                          {ownerInfo && ` · ${ownerInfo.emoji}`}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold flex-shrink-0 ml-2 ${
                        account.kind === 'liability' ? 'text-red-500' : 'text-foreground'
                      }`}
                    >
                      {account.kind === 'liability' && '-'}
                      {money(account.balance)}
                    </span>
                  </Link>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground px-3 py-6 text-center">
                No accounts linked yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
