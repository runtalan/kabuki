'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Area,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Pencil, Check, X, Home as HomeIcon } from 'lucide-react';
import { OwnerBadge } from '@/components/owner-badge';
import { EmptyChartState } from '@/components/charts/empty-chart-state';
import { useIsDemo } from '@/hooks/use-is-demo';
import { buildAmortizationSchedule, monthsElapsedSince } from '@/lib/loan-amortization';
import { formatFullCurrency as money } from '@/lib/format';
import type { PropertyWithComputed, EquitySeriesPoint } from '@/lib/properties';

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

interface EditState {
  estimatedValue: string;
  originalLoanAmount: string;
  interestRate: string;
  loanTermYears: string;
  loanStartDate: string;
}

function editStateFor(property: PropertyWithComputed): EditState {
  return {
    estimatedValue: String(property.estimatedValue),
    originalLoanAmount: String(property.originalLoanAmount),
    interestRate: String(property.interestRate),
    loanTermYears: String(property.loanTermYears),
    loanStartDate: toDateInputValue(property.loanStartDate),
  };
}

// Client-computed sparkline of equity-over-time for a single property, built
// from its own amortization schedule so this page never needs a second
// server round-trip for per-property history. Estimated value is held flat
// at its current figure across the sparkline (we don't have historical
// per-property valuations here — the combined chart above is what tracks
// that) — only the loan balance side moves, which is still a meaningful
// "equity is climbing as the loan pays down" signal.
function buildSparkline(property: PropertyWithComputed) {
  const paymentsMade = monthsElapsedSince(new Date(property.loanStartDate));
  const schedule = buildAmortizationSchedule(
    property.originalLoanAmount,
    property.interestRate,
    property.loanTermYears
  );
  const elapsed = Math.min(paymentsMade, schedule.length);

  const points: { month: number; equity: number }[] = [
    { month: 0, equity: property.estimatedValue - property.originalLoanAmount },
  ];

  if (elapsed > 0) {
    const step = Math.max(1, Math.floor(elapsed / 11));
    for (let m = step; m < elapsed; m += step) {
      points.push({ month: m, equity: property.estimatedValue - schedule[m - 1].balance });
    }
    points.push({ month: elapsed, equity: property.estimatedValue - schedule[elapsed - 1].balance });
  }

  return points;
}

function CombinedEquityChart({ equitySeries }: { equitySeries: EquitySeriesPoint[] }) {
  if (equitySeries.length < 2) {
    return (
      <div className="w-full h-80">
        <EmptyChartState message="Not enough history yet to chart equity over time" height={320} />
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={equitySeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.7} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
          <YAxis
            stroke="var(--muted-foreground)"
            tickFormatter={(value) => money(value)}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: '4 4' }}
            formatter={(value, name) => [money(Number(value)), String(name)]}
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="totalEquity"
            name="Equity"
            stroke="var(--primary)"
            fill="url(#colorEquity)"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="totalValue"
            name="Est. value"
            stroke="var(--chart-3)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="totalLoanBalance"
            name="Loan balance"
            stroke="var(--chart-4)"
            strokeWidth={2}
            dot={false}
            strokeDasharray="4 3"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-5 mt-3 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--primary)' }} /> Equity
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--chart-3)' }} /> Est. value
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--chart-4)' }} /> Loan balance
        </span>
      </div>
    </div>
  );
}

function PropertySparkline({ property }: { property: PropertyWithComputed }) {
  const points = buildSparkline(property);
  if (points.length < 2) {
    return <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">Not enough history yet</div>;
  }
  return (
    <div className="h-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <Line
            type="monotone"
            dataKey="equity"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PropertyCard({ property }: { property: PropertyWithComputed }) {
  const router = useRouter();
  const isDemo = useIsDemo();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<EditState>(() => editStateFor(property));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setForm(editStateFor(property));
    setError(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setError(null);
  }

  async function save() {
    const original = editStateFor(property);
    const payload: Record<string, number | string> = {};

    if (form.estimatedValue !== original.estimatedValue) {
      const v = parseFloat(form.estimatedValue);
      if (!Number.isNaN(v)) payload.estimatedValue = v;
    }
    if (form.originalLoanAmount !== original.originalLoanAmount) {
      const v = parseFloat(form.originalLoanAmount);
      if (!Number.isNaN(v)) payload.originalLoanAmount = v;
    }
    if (form.interestRate !== original.interestRate) {
      const v = parseFloat(form.interestRate);
      if (!Number.isNaN(v)) payload.interestRate = v;
    }
    if (form.loanTermYears !== original.loanTermYears) {
      const v = parseInt(form.loanTermYears, 10);
      if (!Number.isNaN(v)) payload.loanTermYears = v;
    }
    if (form.loanStartDate !== original.loanStartDate) {
      payload.loanStartDate = form.loanStartDate;
    }

    if (Object.keys(payload).length === 0) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save changes');
      }
      setIsEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-foreground">{property.name}</h3>
            <OwnerBadge owner={property.owner} />
          </div>
          {property.address && (
            <p className="text-xs text-muted-foreground mt-0.5">{property.address}</p>
          )}
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={startEdit}
            disabled={isDemo}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={isDemo ? 'View-only in demo mode' : 'Edit loan details'}
            aria-label="Edit loan details"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">
              Estimated value
              <input
                type="number"
                value={form.estimatedValue}
                onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Original loan amount
              <input
                type="number"
                value={form.originalLoanAmount}
                onChange={(e) => setForm({ ...form, originalLoanAmount: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Interest rate (%)
              <input
                type="number"
                step="0.01"
                value={form.interestRate}
                onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Loan term (years)
              <input
                type="number"
                value={form.loanTermYears}
                onChange={(e) => setForm({ ...form, loanTermYears: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
              />
            </label>
            <label className="text-xs text-muted-foreground col-span-2">
              Loan start date
              <input
                type="date"
                value={form.loanStartDate}
                onChange={(e) => setForm({ ...form, loanStartDate: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
              />
            </label>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={isSaving}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={isSaving}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              <Check className="w-3.5 h-3.5" /> {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Value</p>
            <p className="text-sm font-semibold text-foreground">{money(property.estimatedValue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Loan balance</p>
            <p className="text-sm font-semibold text-foreground">{money(property.remainingBalance)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Equity</p>
            <p className={`text-lg font-bold ${property.equity >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {money(property.equity)}
            </p>
          </div>
        </div>
      )}

      <PropertySparkline property={property} />
    </div>
  );
}

export function PropertiesOverview({
  properties,
  equitySeries,
}: {
  properties: PropertyWithComputed[];
  equitySeries: EquitySeriesPoint[];
}) {
  if (properties.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <HomeIcon className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-40" />
        <h2 className="text-base font-semibold text-foreground mb-1">No properties yet</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Add a property to start tracking its value, loan balance, and equity over time.
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

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Combined equity</h2>
        <CombinedEquityChart equitySeries={equitySeries} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </div>
  );
}
