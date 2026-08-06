'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Home as HomeIcon } from 'lucide-react';
import { EmptyChartState } from '@/components/charts/empty-chart-state';
import { buildAmortizationSchedule, calculatePayoffWithExtra } from '@/lib/loan-amortization';
import type { PropertyWithComputed } from '@/lib/properties';

function money(value: number, decimals = 0) {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function monthsToYearsMonths(totalMonths: number): string {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years === 1 ? '' : 's'}`);
  if (months > 0) parts.push(`${months} mo${months === 1 ? '' : 's'}`);
  if (parts.length === 0) return '0 mos';
  return parts.join(' ');
}

// Mirrors calculatePayoffWithExtra's amortization loop exactly, but records
// the balance at every month instead of collapsing straight to a summary —
// this is what the comparison chart needs and doesn't belong in the shared
// lib since it's purely a presentation concern for this one chart.
function buildExtraPaymentBalances(
  principal: number,
  annualRatePct: number,
  termYears: number,
  extraMonthly: number
): number[] {
  const monthlyRate = annualRatePct / 100 / 12;
  const numPayments = termYears * 12;
  const basePayment =
    monthlyRate === 0
      ? principal / numPayments
      : (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);

  if (extraMonthly <= 0) {
    return buildAmortizationSchedule(principal, annualRatePct, termYears).map((row) => row.balance);
  }

  const totalPayment = basePayment + extraMonthly;
  const balances: number[] = [];
  let balance = principal;
  let month = 0;

  while (balance > 0.01 && month < numPayments) {
    const interestPaid = balance * monthlyRate;
    const principalPaid = Math.min(totalPayment - interestPaid, balance);
    balance = Math.max(balance - principalPaid, 0);
    month++;
    balances.push(balance);
  }

  return balances;
}

interface ChartPoint {
  month: number;
  original: number;
  extra: number;
}

// Downsamples the month-by-month balances into a manageable number of chart
// points (a 30yr loan is 360 months — plotting every one is wasted density).
function buildComparisonSeries(originalBalances: number[], extraBalances: number[]): ChartPoint[] {
  const totalMonths = originalBalances.length;
  const step = Math.max(1, Math.floor(totalMonths / 60));
  const points: ChartPoint[] = [{ month: 0, original: originalBalances[0] ?? 0, extra: extraBalances[0] ?? 0 }];

  for (let m = step; m < totalMonths; m += step) {
    points.push({
      month: m,
      original: originalBalances[m - 1],
      extra: m - 1 < extraBalances.length ? extraBalances[m - 1] : 0,
    });
  }

  points.push({
    month: totalMonths,
    original: originalBalances[totalMonths - 1] ?? 0,
    extra: totalMonths - 1 < extraBalances.length ? extraBalances[totalMonths - 1] : 0,
  });

  return points;
}

function ComparisonChart({ data }: { data: ChartPoint[] }) {
  if (data.length < 2) {
    return <EmptyChartState message="Not enough term left to chart" height={280} />;
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${Math.round(value / 12)}y`}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            tickFormatter={(value) => money(value)}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: '4 4' }}
            formatter={(value, name) => [money(Number(value)), String(name)]}
            labelFormatter={(label) => `Month ${label}`}
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="original"
            name="Original schedule"
            stroke="var(--chart-4)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="extra"
            name="With extra payment"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-5 mt-3 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--chart-4)' }} /> Original schedule
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--primary)' }} /> With extra payment
        </span>
      </div>
    </div>
  );
}

export function PayAheadCalculator({ properties }: { properties: PropertyWithComputed[] }) {
  const [selectedId, setSelectedId] = useState<string>(properties[0]?.id ?? '');
  const [extraMonthly, setExtraMonthly] = useState<string>('250');

  const property = properties.find((p) => p.id === selectedId) ?? properties[0];

  const extraAmount = Math.max(0, Number(extraMonthly) || 0);

  const comparison = useMemo(() => {
    if (!property) return null;
    return calculatePayoffWithExtra(
      property.originalLoanAmount,
      property.interestRate,
      property.loanTermYears,
      extraAmount
    );
  }, [property, extraAmount]);

  const chartData = useMemo(() => {
    if (!property) return [];
    const originalBalances = buildAmortizationSchedule(
      property.originalLoanAmount,
      property.interestRate,
      property.loanTermYears
    ).map((row) => row.balance);
    const extraBalances = buildExtraPaymentBalances(
      property.originalLoanAmount,
      property.interestRate,
      property.loanTermYears,
      extraAmount
    );
    return buildComparisonSeries(originalBalances, extraBalances);
  }, [property, extraAmount]);

  const newPayoffDate = useMemo(() => {
    if (!property || !comparison) return null;
    const date = new Date(property.loanStartDate);
    date.setMonth(date.getMonth() + comparison.newMonths);
    return date;
  }, [property, comparison]);

  if (properties.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <HomeIcon className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-40" />
        <h2 className="text-base font-semibold text-foreground mb-1">No properties yet</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Add a property with a loan to see how extra payments would shorten its payoff.
        </p>
        <Link
          href="/properties/manage"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Manage Properties
        </Link>
      </div>
    );
  }

  if (!property || !comparison) return null;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-xs text-muted-foreground">
            Property
            <select
              value={property.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Extra monthly payment
            <div className="mt-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                min="0"
                step="10"
                value={extraMonthly}
                onChange={(e) => setExtraMonthly(e.target.value)}
                className="w-full rounded-md border border-border bg-background pl-7 pr-3 py-2 text-sm text-foreground"
              />
            </div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border p-4 bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Interest Saved</p>
          <p className="text-2xl font-bold text-emerald-600">{money(comparison.interestSaved)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            vs. {money(comparison.originalTotalInterest)} original total interest
          </p>
        </div>
        <div className="rounded-lg border border-border p-4 bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Time Saved</p>
          <p className="text-2xl font-bold text-foreground">{monthsToYearsMonths(comparison.monthsSaved)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {monthsToYearsMonths(comparison.newMonths)} payoff, down from {monthsToYearsMonths(comparison.originalMonths)}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4 bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">New Payoff Date</p>
          <p className="text-2xl font-bold text-foreground">
            {newPayoffDate?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            was {new Date(property.payoffDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Loan balance over time</h2>
        <ComparisonChart data={chartData} />
      </div>
    </div>
  );
}
