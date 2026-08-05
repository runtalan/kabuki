'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/format';

interface MonthPoint {
  month: string;
  year: number;
  label: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  isCurrentMonth?: boolean;
}

const RANGES = [
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
  { label: '2Y', months: 24 },
] as const;

function CashFlowTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: MonthPoint }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div className="min-w-[190px] rounded-xl bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 shadow-2xl px-4 py-3">
      <p className="text-xs font-semibold text-zinc-100 mb-2">{point.label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-6 text-xs">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-500" />
            Income:
          </span>
          <span className="font-semibold text-zinc-100 tabular-nums">
            {formatCurrency(point.income)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6 text-xs">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-2 h-2 rounded-full flex-shrink-0 bg-red-500" />
            Expenses:
          </span>
          <span className="font-semibold text-zinc-100 tabular-nums">
            {formatCurrency(point.expenses)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6 text-xs">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-2 h-2 rounded-full flex-shrink-0 border border-zinc-400" />
            Savings:
          </span>
          <span className="font-semibold text-zinc-100 tabular-nums">
            {formatCurrency(point.savings)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6 text-xs">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-2 h-2 rounded-full flex-shrink-0 border border-zinc-400" />
            Savings Rate:
          </span>
          <span className="font-semibold text-zinc-100 tabular-nums">
            {point.savingsRate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function CurrentMonthDot(props: { cx?: number; cy?: number; payload?: MonthPoint }) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined) return null;
  if (!payload?.isCurrentMonth) return <circle cx={cx} cy={cy} r={3} fill="hsl(var(--foreground))" />;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="hsl(var(--card))"
      stroke="hsl(var(--foreground))"
      strokeWidth={2}
    />
  );
}

export function CashFlowChart({ series }: { series: MonthPoint[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]['label']>('1Y');

  const filtered = useMemo(() => {
    const months = RANGES.find((r) => r.label === range)?.months ?? 12;
    return series.slice(Math.max(0, series.length - months));
  }, [series, range]);

  const chartData = useMemo(
    () => filtered.map((m) => ({ ...m, expensesNeg: -m.expenses })),
    [filtered]
  );

  if (series.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
        Not enough history to chart yet — check back after a month or two of activity.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
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

      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              minTickGap={15}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(value) => `$${formatNumber(value)}`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} content={<CashFlowTooltip />} />
            <Bar dataKey="income" name="Income" stackId="cf" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar
              dataKey="expensesNeg"
              name="Expenses"
              stackId="cf"
              fill="#ef4444"
              radius={[0, 0, 3, 3]}
              maxBarSize={28}
            />
            <Line
              type="monotone"
              dataKey="savings"
              name="Savings"
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              dot={<CurrentMonthDot />}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-5 mt-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Income
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Expenses
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-foreground" /> Net
        </span>
      </div>
    </div>
  );
}
