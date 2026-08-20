'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingDown, TrendingUp, Wallet, CreditCard, PiggyBank, Landmark } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { getTypeBadge } from '@/lib/account-types';
import { ChartTooltip } from '@/components/charts/chart-tooltip';

const ACCOUNT_ICONS: Record<string, typeof Wallet> = { Wallet, CreditCard, PiggyBank, TrendingUp, Landmark };

interface SeriesPoint {
  date: string;
  iso: string;
  netWorth: number;
  assets: number;
  liabilities: number;
  flow?: number;
}

interface AccountInfo {
  id: string;
  name: string;
  type: string;
  subtype?: string | null;
  balance: number;
  kind: 'asset' | 'liability';
  icon?: string | null;
  mask?: string | null;
  liabilityType?: string | null;
  assetType?: string | null;
  /** Net money in/out over the rolling last 30 days; undefined = no activity. */
  flow30d?: number;
}

const RANGES = [
  { label: '1M', days: 31 },
  { label: '3M', days: 92 },
  { label: '6M', days: 183 },
  { label: '1Y', days: 366 },
  { label: 'All', days: Infinity },
] as const;

function money(value: number, decimals = 0) {
  return `$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

// Buckets accounts into the display groups used by the breakdown tables.
function assetGroup(acc: AccountInfo): string {
  if (acc.assetType === 'property') return 'Property';
  const sub = (acc.subtype || '').toLowerCase();
  if (['brokerage', 'investment', 'ira', '401k', 'roth'].some((s) => sub.includes(s)))
    return 'Investments';
  if (['checking', 'savings', 'money market', 'cd', 'cash management', 'hsa'].some((s) => sub.includes(s)))
    return 'Cash';
  if (acc.type === 'depository') return 'Cash';
  if (acc.type === 'investment') return 'Investments';
  return 'Other Assets';
}

function liabilityGroup(acc: AccountInfo): string {
  const key = (acc.liabilityType || acc.subtype || '').toLowerCase();
  if (key.includes('credit')) return 'Credit Cards';
  if (key.includes('mortgage')) return 'Mortgages';
  return 'Loans';
}

const ASSET_GROUP_ORDER = ['Cash', 'Investments', 'Property', 'Other Assets'];
const LIABILITY_GROUP_ORDER = ['Credit Cards', 'Loans', 'Mortgages'];

// Fixed categorical palette (CVD-validated); vars re-step per theme in globals.css.
const GROUP_COLORS: Record<string, string> = {
  Cash: 'var(--viz-blue)',
  Investments: 'var(--viz-orange)',
  Property: 'var(--viz-aqua)',
  'Other Assets': 'var(--viz-yellow)',
  'Credit Cards': 'var(--viz-magenta)',
  Loans: 'var(--viz-green)',
  Mortgages: 'var(--viz-violet)',
};

function GroupedAccountList({
  title,
  accounts,
  groupOrder,
  groupFn,
  total,
  isLiability,
}: {
  title: string;
  accounts: AccountInfo[];
  groupOrder: string[];
  groupFn: (acc: AccountInfo) => string;
  total: number;
  isLiability?: boolean;
}) {
  const groups = new Map<string, AccountInfo[]>();
  for (const acc of accounts) {
    const g = groupFn(acc);
    groups.set(g, [...(groups.get(g) || []), acc]);
  }
  for (const accs of groups.values()) {
    accs.sort((a, b) => b.balance - a.balance);
  }
  const groupTotals = new Map(
    [...groups.entries()].map(([g, accs]) => [g, accs.reduce((s, a) => s + a.balance, 0)]),
  );
  const orderedGroups = groupOrder
    .filter((g) => groups.has(g))
    .sort((a, b) => (groupTotals.get(b) ?? 0) - (groupTotals.get(a) ?? 0));
  const maxBalance = Math.max(...accounts.map((a) => Math.abs(a.balance)), 1);

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </p>
        <span className={`text-sm font-bold ${isLiability ? 'text-red-500' : 'text-foreground'}`}>
          {isLiability && total > 0 && '-'}
          {money(total)}
        </span>
      </div>
      {orderedGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {isLiability
            ? 'No liabilities tracked — nice.'
            : 'No accounts yet — link one or add it manually from Accounts.'}
        </p>
      ) : (
        <>
          {/* Allocation strip: one segment per group, 2px surface gaps */}
          {total > 0 && (
            <div className="flex h-2.5 rounded-full overflow-hidden gap-[2px] mb-5">
              {orderedGroups.map((groupName) => {
                const groupTotal = groups
                  .get(groupName)!
                  .reduce((s, a) => s + a.balance, 0);
                return (
                  <div
                    key={groupName}
                    className="min-w-[4px]"
                    style={{
                      width: `${(groupTotal / total) * 100}%`,
                      backgroundColor: GROUP_COLORS[groupName],
                    }}
                  />
                );
              })}
            </div>
          )}
          <div className="space-y-5">
            {orderedGroups.map((groupName) => {
              const groupAccounts = groups.get(groupName)!;
              const groupTotal = groupAccounts.reduce((s, a) => s + a.balance, 0);
              const share = total > 0 ? Math.round((groupTotal / total) * 100) : 0;
              const color = GROUP_COLORS[groupName];
              return (
                <div key={groupName}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      {groupName}{' '}
                      <span className="text-muted-foreground font-normal">({share}%)</span>
                    </p>
                    <span className="text-sm font-medium text-foreground">{money(groupTotal)}</span>
                  </div>
                  <div className="space-y-1">
                    {groupAccounts.map((acc) => {
                      const badge = getTypeBadge(acc);
                      const Icon = ACCOUNT_ICONS[acc.icon || ''] || Wallet;
                      const pct = Math.max(
                        (Math.abs(acc.balance) / maxBalance) * 100,
                        1.5,
                      );
                      return (
                        <Link
                          key={acc.id}
                          href={`/accounts/${acc.id}`}
                          className="block px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: badge.color + '1a', color: badge.color }}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-sm text-foreground truncate">
                                {acc.name}
                                {acc.mask && (
                                  <span className="text-muted-foreground"> ••{acc.mask}</span>
                                )}
                              </span>
                            </div>
                            <div className="flex-shrink-0 ml-2 text-right">
                              <span className="block text-sm font-medium text-foreground">
                                {money(acc.balance)}
                              </span>
                              {!isLiability && acc.flow30d !== undefined && acc.flow30d !== 0 && (
                                <span
                                  className={`block text-[11px] font-medium ${
                                    acc.flow30d > 0 ? 'text-emerald-500' : 'text-muted-foreground'
                                  }`}
                                >
                                  {acc.flow30d > 0 ? '+' : '−'}
                                  {money(acc.flow30d)} · 30d
                                </span>
                              )}
                            </div>
                          </div>
                          <div
                            className="h-1.5 rounded-full ml-[38px]"
                            style={{
                              background: `color-mix(in oklab, ${color} 14%, transparent)`,
                            }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {!isLiability &&
            accounts.some((a) => a.flow30d !== undefined && a.flow30d !== 0) && (
              <p className="mt-5 pt-4 border-t border-border text-[11px] text-muted-foreground">
                “30d” is net money added to (or taken out of) that account over a
                rolling 30-day window — deposits and transfers in, minus money out.
                Market gains aren’t included.
              </p>
            )}
        </>
      )}
    </div>
  );
}

export function NetWorthView({
  series,
  accounts,
}: {
  series: SeriesPoint[];
  accounts: AccountInfo[];
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]['label']>('3M');

  const filtered = useMemo(() => {
    const days = RANGES.find((r) => r.label === range)?.days ?? Infinity;
    if (!Number.isFinite(days)) return series;
    return series.slice(Math.max(0, series.length - days));
  }, [series, range]);

  const assets = accounts.filter((a) => a.kind !== 'liability');
  const liabilities = accounts.filter((a) => a.kind === 'liability');
  const assetTotal = assets.reduce((s, a) => s + a.balance, 0);
  const liabilityTotal = liabilities.reduce((s, a) => s + a.balance, 0);
  const netWorth = assetTotal - liabilityTotal;

  const first = filtered[0];
  const last = filtered[filtered.length - 1];
  // Split of the window's change: net contributions (signed transaction
  // flow, transfers excluded) vs the residual — market moves, revaluations,
  // interest, and anything transactions don't capture. Skip the first day:
  // its flow is already baked into the window's starting balance.
  const contributions = filtered.slice(1).reduce((s, p) => s + (p.flow ?? 0), 0);
  const delta =
    first && last && filtered.length > 1 && first.netWorth !== 0
      ? {
          dollars: last.netWorth - first.netWorth,
          pct: ((last.netWorth - first.netWorth) / Math.abs(first.netWorth)) * 100,
        }
      : null;

  return (
    <div className="space-y-6">
      {/* Hero: total + range toggle + assets vs liabilities chart */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
              Total Net Worth
            </p>
            <p className="text-4xl font-bold text-foreground">
              {netWorth < 0 && '-'}
              {money(netWorth)}
            </p>
            {delta && (
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
                {delta.pct.toFixed(1)}%) over {range === 'All' ? 'all time' : `the last ${range}`}
              </p>
            )}
            {delta && (
              <div className="mt-3 flex items-center gap-6">
                {[
                  { label: 'Net contributions', value: contributions },
                  { label: 'Market & other', value: delta.dollars - contributions },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                    <p
                      className={`text-sm font-semibold ${
                        value >= 0 ? 'text-emerald-500' : 'text-red-500'
                      }`}
                    >
                      {value >= 0 ? '+' : '-'}
                      {money(value)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 bg-muted/40 rounded-full p-1">
            {RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => setRange(r.label)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  range === r.label
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 1 ? (
          <div className="w-full h-48 md:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filtered} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="nwAssets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="nwLiabilities" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  minTickGap={40}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => `$${formatNumber(value)}`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '4 4' }}
                  content={<ChartTooltip />}
                />
                <Area
                  type="monotone"
                  dataKey="assets"
                  name="Assets"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#nwAssets)"
                />
                <Area
                  type="monotone"
                  dataKey="liabilities"
                  name="Liabilities"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#nwLiabilities)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
            Not enough history to chart yet — check back after a sync or two.
          </div>
        )}
        {filtered.length > 1 && (
          <div className="flex items-center gap-5 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Assets
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Liabilities
            </span>
          </div>
        )}
      </div>

      {/* Breakdown tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GroupedAccountList
          title="Assets"
          accounts={assets}
          groupOrder={ASSET_GROUP_ORDER}
          groupFn={assetGroup}
          total={assetTotal}
        />
        <GroupedAccountList
          title="Liabilities"
          accounts={liabilities}
          groupOrder={LIABILITY_GROUP_ORDER}
          groupFn={liabilityGroup}
          total={liabilityTotal}
          isLiability
        />
      </div>
    </div>
  );
}
