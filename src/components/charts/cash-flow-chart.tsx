'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  Cell,
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
  monthKey: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  isCurrentMonth?: boolean;
  hasData: boolean;
}

const RANGES = [
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
  { label: '2Y', months: 24 },
] as const;

const NO_DATA_COLOR = '#9ca3af';

function CashFlowTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: MonthPoint }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  if (!point.hasData) {
    return (
      <div className="min-w-[190px] rounded-xl bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 shadow-2xl px-4 py-3">
        <p className="text-xs font-semibold text-zinc-100 mb-1">{point.label}</p>
        <p className="text-xs text-zinc-400">No transactions this month</p>
      </div>
    );
  }

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

function MonthDot(props: { cx?: number; cy?: number; payload?: MonthPoint }) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined) return null;
  // No data that month → hollow grey dot, never the solid "things happened
  // here" marker. A month with zero net (real breakeven) still gets the
  // normal dot; this is specifically the "we don't actually know" case.
  if (!payload?.hasData) {
    return <circle cx={cx} cy={cy} r={3} fill="var(--card)" stroke={NO_DATA_COLOR} strokeWidth={1.5} />;
  }
  if (!payload?.isCurrentMonth) return <circle cx={cx} cy={cy} r={3} fill="var(--foreground)" />;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="var(--card)"
      stroke="var(--foreground)"
      strokeWidth={2}
    />
  );
}

// Net cash flow amount rendered directly above each point on the line, e.g.
// "+$1,000" or "-$88" — so the sign/size reads at a glance without hovering.
// Drawn on a small pill background since the dot often sits inside the
// income/expense bars, where plain text would be unreadable. Skipped
// entirely for no-data months — a "+$0" pill there would read as "broke
// even" instead of "we don't know," which is the opposite of true.
function NetLabel(props: { x?: number; y?: number; value?: number; payload?: MonthPoint }) {
  const { x, y, value, payload } = props;
  if (x === undefined || y === undefined || value === undefined) return null;
  if (payload && !payload.hasData) return null;
  const positive = value >= 0;
  const text = `${positive ? '+' : '-'}${formatCurrency(Math.abs(value))}`;
  const width = text.length * 6 + 10;
  const baseline = y - 14;
  return (
    <g>
      <rect
        x={x - width / 2}
        y={baseline - 10}
        width={width}
        height={14}
        rx={7}
        fill="var(--card)"
        stroke="var(--border)"
        strokeWidth={1}
      />
      <text
        x={x}
        y={baseline}
        textAnchor="middle"
        fontSize={10}
        fontWeight={700}
        fill={positive ? '#10b981' : '#ef4444'}
      >
        {text}
      </text>
    </g>
  );
}

export function CashFlowChart({
  series,
  selectedMonthKey,
  onSelectMonth,
}: {
  series: MonthPoint[];
  selectedMonthKey?: string;
  onSelectMonth?: (monthKey: string) => void;
}) {
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

  const handleBarClick = (data: { payload?: MonthPoint }) => {
    if (data.payload) onSelectMonth?.(data.payload.monthKey);
  };

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

      <div className="w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 30, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="var(--muted-foreground)"
              tick={{ fontSize: 12 }}
              minTickGap={15}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              tickFormatter={(value) => `$${formatNumber(value)}`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.3 }} content={<CashFlowTooltip />} />
            <Bar
              dataKey="income"
              name="Income"
              stackId="cf"
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
              onClick={handleBarClick}
              className={onSelectMonth ? 'cursor-pointer' : undefined}
            >
              {chartData.map((d) => (
                <Cell
                  key={d.monthKey}
                  fill={d.hasData ? '#10b981' : NO_DATA_COLOR}
                  fillOpacity={d.monthKey === selectedMonthKey ? 1 : d.hasData ? 0.85 : 0.5}
                  stroke={d.monthKey === selectedMonthKey ? 'var(--foreground)' : undefined}
                  strokeWidth={d.monthKey === selectedMonthKey ? 1.5 : 0}
                />
              ))}
            </Bar>
            <Bar
              dataKey="expensesNeg"
              name="Expenses"
              stackId="cf"
              radius={[0, 0, 3, 3]}
              maxBarSize={28}
              onClick={handleBarClick}
              className={onSelectMonth ? 'cursor-pointer' : undefined}
            >
              {chartData.map((d) => (
                <Cell
                  key={d.monthKey}
                  fill={d.hasData ? '#ef4444' : NO_DATA_COLOR}
                  fillOpacity={d.monthKey === selectedMonthKey ? 1 : d.hasData ? 0.85 : 0.5}
                  stroke={d.monthKey === selectedMonthKey ? 'var(--foreground)' : undefined}
                  strokeWidth={d.monthKey === selectedMonthKey ? 1.5 : 0}
                />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="savings"
              name="Savings"
              stroke="var(--foreground)"
              strokeWidth={2}
              dot={<MonthDot />}
              activeDot={{ r: 5 }}
              label={<NetLabel />}
              isAnimationActive={false}
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
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NO_DATA_COLOR }} /> No data
        </span>
        {onSelectMonth && (
          <span className="text-xs text-muted-foreground/70 ml-auto">Click a month to view it below</span>
        )}
      </div>
    </div>
  );
}
