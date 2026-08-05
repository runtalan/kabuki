'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber } from '@/lib/format';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { CategoryBreakdown } from '@/components/spending/category-breakdown';
import { TopMerchants } from '@/components/spending/top-merchants';

interface Overview {
  spentThisMonth: number;
  monthlyAverage: number;
  daysElapsed: number;
  daysInMonth: number;
  velocity: { day: number; current: number | null; previous: number }[];
}

interface SpendingData {
  id?: string;
  name: string;
  value: number;
  color: string;
  icon?: string | null;
}

interface BudgetCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  monthlyBudget: number | null;
}

interface Merchant {
  name: string;
  amount: number;
  categoryIcon: string | null;
  categoryColor: string | null;
}

function money(value: number, decimals = 0) {
  return `$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function SpendingOverview({
  overview,
  spendingByCategory,
  budgetCategories,
  topMerchants,
  isCurrentMonth = true,
  refDate,
}: {
  overview: Overview;
  spendingByCategory: SpendingData[];
  budgetCategories: BudgetCategory[];
  topMerchants: Merchant[];
  isCurrentMonth?: boolean;
  refDate: string;
}) {
  const { spentThisMonth, monthlyAverage, daysElapsed, daysInMonth, velocity } = overview;

  // Compare against the average pro-rated to this point in the month, so
  // "you're ahead of your usual pace" is a fair statement on day 10. For a
  // completed past month, daysElapsed === daysInMonth so this naturally
  // becomes a plain vs-average comparison.
  const proRatedAverage = monthlyAverage * (daysElapsed / daysInMonth);
  const vsAveragePct =
    monthlyAverage > 0 ? Math.min((spentThisMonth / monthlyAverage) * 100, 100) : 0;
  const aheadOfPace = proRatedAverage > 0 && spentThisMonth > proRatedAverage;

  return (
    <div className="space-y-6">
      {/* Monthly Spending Pulse */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
          {isCurrentMonth ? 'Spend This Month' : 'Spend This Period'}
        </p>
        <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
          <p className="text-4xl font-bold text-foreground">{money(spentThisMonth)}</p>
          {monthlyAverage > 0 ? (
            <p className="text-sm text-muted-foreground">
              {money(monthlyAverage)} monthly average ·{' '}
              <span className={aheadOfPace ? 'text-amber-500 font-medium' : 'text-emerald-500 font-medium'}>
                {aheadOfPace ? 'above' : 'below'} {isCurrentMonth ? 'your usual pace' : 'your usual average'}
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No prior months yet — averages appear next month.
            </p>
          )}
        </div>
        {monthlyAverage > 0 && (
          <div>
            <div className="h-3 rounded-full bg-muted/50 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all ${
                  spentThisMonth > monthlyAverage
                    ? 'bg-red-500'
                    : aheadOfPace
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${vsAveragePct}%` }}
              />
              {/* pace marker: where spend "should" be by today */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
                style={{ left: `${(daysElapsed / daysInMonth) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
              <span>Day {daysElapsed} of {daysInMonth}</span>
              <span>{Math.round((spentThisMonth / monthlyAverage) * 100)}% of monthly average</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Merchants */}
        <div className="lg:col-span-2">
          <TopMerchants merchants={topMerchants} />
        </div>

        {/* Category Breakdown */}
        <div className="lg:col-span-1">
          <CategoryBreakdown
            spendingByCategory={spendingByCategory}
            budgetCategories={budgetCategories}
            refDate={refDate}
          />
        </div>
      </div>

      {/* Spending Velocity */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
          Spending Velocity
        </p>
        {velocity.length > 0 ? (
          <>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={velocity} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="day"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                    minTickGap={30}
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
                  <Line
                    type="monotone"
                    dataKey="previous"
                    name="Last month"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="current"
                    name="This month"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-5 mt-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-4 h-0.5 rounded bg-blue-500" /> This month (cumulative)
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-4 h-0.5 rounded bg-muted-foreground" style={{ borderTop: '2px dashed' }} /> Last month
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-10 text-center">
            Not enough transaction history to chart daily spend yet.
          </p>
        )}
      </div>
    </div>
  );
}
