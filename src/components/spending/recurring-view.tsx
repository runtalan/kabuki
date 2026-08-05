'use client';

import { CalendarClock, RefreshCcw, TrendingUp } from 'lucide-react';
import { CategoryIcon } from '@/components/category-icon';
import type { RecurringItem } from '@/lib/spending-insights';

const FREQUENCY_LABELS: Record<RecurringItem['frequency'], string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

function money(value: number, decimals = 2) {
  return `$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function dueLabel(isoDate: string) {
  const next = new Date(isoDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((next.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 14) return `Due in ${days} days`;
  return `On ${next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export function RecurringView({ items }: { items: RecurringItem[] }) {
  const bills = items.filter((i) => !i.isIncome);
  const income = items.filter((i) => i.isIncome);
  const monthlyOutflow = bills.reduce((s, i) => s + i.monthlyCost, 0);
  const priceIncreases = bills.filter((i) => i.priceIncreased);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">
            Projected Monthly Outflow
          </p>
          <p className="text-3xl font-bold text-foreground">{money(monthlyOutflow, 0)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Across {bills.length} recurring {bills.length === 1 ? 'bill' : 'bills'} (yearly charges
            pro-rated)
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">
            Recurring Income
          </p>
          <p className="text-3xl font-bold text-emerald-500">
            +{money(income.reduce((s, i) => s + i.monthlyCost, 0), 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {income.length > 0
              ? `${income.length} detected ${income.length === 1 ? 'source' : 'sources'} per month`
              : 'No recurring deposits detected yet'}
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">
            Price Changes
          </p>
          <p className={`text-3xl font-bold ${priceIncreases.length > 0 ? 'text-amber-500' : 'text-foreground'}`}>
            {priceIncreases.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {priceIncreases.length > 0
              ? 'Subscriptions charged more than last cycle'
              : 'No recent price increases detected'}
          </p>
        </div>
      </div>

      {/* Bills & subscriptions */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
          Subscriptions & Bills
        </p>
        {bills.length > 0 ? (
          <div className="divide-y divide-border">
            {bills.map((item) => (
              <div
                key={`${item.merchant}-${item.frequency}`}
                className="flex items-center justify-between py-3 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (item.categoryColor || '#6b7280') + '22' }}
                  >
                    <CategoryIcon
                      icon={item.categoryIcon}
                      color={item.categoryColor}
                      className="w-4.5 h-4.5"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {item.merchant}
                      </p>
                      {item.priceIncreased && item.previousAmount !== null && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-[10px] font-semibold flex-shrink-0">
                          <TrendingUp className="w-3 h-3" />
                          was {money(item.previousAmount)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <RefreshCcw className="w-3 h-3" />
                      {FREQUENCY_LABELS[item.frequency]}
                      <span className="text-muted-foreground/60">·</span>
                      <CalendarClock className="w-3 h-3" />
                      {dueLabel(item.nextDate)}
                      {item.categoryName && (
                        <>
                          <span className="text-muted-foreground/60">·</span>
                          {item.categoryName}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-foreground">{money(item.amount)}</p>
                  {item.frequency !== 'monthly' && (
                    <p className="text-xs text-muted-foreground">
                      ≈{money(item.monthlyCost, 0)}/mo
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No recurring charges detected yet. Detection needs a few billing cycles of history —
            check back after your accounts have synced a couple months of transactions.
          </p>
        )}
      </div>

      {/* Recurring income */}
      {income.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
            Recurring Income
          </p>
          <div className="divide-y divide-border">
            {income.map((item) => (
              <div
                key={`${item.merchant}-${item.frequency}`}
                className="flex items-center justify-between py-3 gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.merchant}</p>
                  <p className="text-xs text-muted-foreground">
                    {FREQUENCY_LABELS[item.frequency]} · {dueLabel(item.nextDate)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-emerald-500 flex-shrink-0">
                  +{money(item.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
