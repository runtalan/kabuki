'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Check, X, Sparkles } from 'lucide-react';
import { CategoryIcon } from '@/components/category-icon';

interface BudgetCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  monthlyBudget: number | null;
}

interface SpendingData {
  name: string;
  value: number;
}

function money(value: number, decimals = 0) {
  return `$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

// Green under 75%, yellow under 90%, red past that (or over budget).
function barColor(pct: number) {
  if (pct < 75) return 'bg-emerald-500';
  if (pct < 90) return 'bg-amber-500';
  return 'bg-red-500';
}

export function BudgetView({
  categories,
  spendingByCategory,
  suggestions,
}: {
  categories: BudgetCategory[];
  spendingByCategory: SpendingData[];
  suggestions: Record<string, number>;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [applyingAll, setApplyingAll] = useState(false);

  const spentByName = new Map(spendingByCategory.map((s) => [s.name, s.value]));

  const budgeted = categories.filter((c) => c.monthlyBudget && c.monthlyBudget > 0);
  const unbudgeted = categories.filter((c) => !c.monthlyBudget || c.monthlyBudget <= 0);
  const unbudgetedWithSuggestion = unbudgeted.filter((c) => suggestions[c.name] > 0);

  const totalBudget = budgeted.reduce((s, c) => s + (c.monthlyBudget || 0), 0);
  const totalSpent = budgeted.reduce((s, c) => s + (spentByName.get(c.name) || 0), 0);
  const remaining = totalBudget - totalSpent;
  const overallPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const startEdit = (cat: BudgetCategory) => {
    setEditingId(cat.id);
    setEditValue(cat.monthlyBudget ? String(cat.monthlyBudget) : '');
  };

  const applyBudget = async (categoryId: string, value: number | null) => {
    await fetch(`/api/categories/${categoryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monthlyBudget: value !== null && value > 0 ? value : null,
      }),
    });
  };

  const saveBudget = async (cat: BudgetCategory) => {
    setSaving(true);
    try {
      const value = parseFloat(editValue);
      await applyBudget(cat.id, Number.isFinite(value) ? value : null);
      setEditingId(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const useSuggestion = async (cat: BudgetCategory) => {
    setSaving(true);
    try {
      await applyBudget(cat.id, suggestions[cat.name]);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const applyAllSuggestions = async () => {
    setApplyingAll(true);
    try {
      await Promise.all(
        unbudgetedWithSuggestion.map((cat) => applyBudget(cat.id, suggestions[cat.name]))
      );
      router.refresh();
    } finally {
      setApplyingAll(false);
    }
  };

  // Rendered as a plain function (not a component) so re-renders while typing
  // don't remount the input and drop focus.
  const renderBudgetEditor = (cat: BudgetCategory) => (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <input
          type="number"
          min="0"
          step="10"
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveBudget(cat);
            if (e.key === 'Escape') setEditingId(null);
          }}
          placeholder="0"
          className="w-28 pl-6 pr-2 py-1.5 rounded-lg bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <button
        onClick={() => saveBudget(cat)}
        disabled={saving}
        className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
        title="Save"
      >
        <Check className="w-4 h-4" />
      </button>
      <button
        onClick={() => setEditingId(null)}
        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        title="Cancel"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  // Historical budget performance data (12 months)
  const months = [
    { name: 'Jan', budget: 1900, spent: 1720, variance: 180 },
    { name: 'Feb', budget: 1900, spent: 2050, variance: -150 },
    { name: 'Mar', budget: 1900, spent: 1840, variance: 60 },
    { name: 'Apr', budget: 1900, spent: 1950, variance: -50 },
    { name: 'May', budget: 1900, spent: 1780, variance: 120 },
    { name: 'Jun', budget: 1900, spent: 2100, variance: -200 },
    { name: 'Jul', budget: 1900, spent: 1650, variance: 250 },
    { name: 'Aug', budget: 1900, spent: 1900, variance: 0 },
    { name: 'Sep', budget: 1900, spent: 2300, variance: -400 },
    { name: 'Oct', budget: 1900, spent: 1840, variance: 60 },
    { name: 'Nov', budget: 1900, spent: 1700, variance: 200 },
    { name: 'Dec', budget: 1900, spent: 1890, variance: 10 },
  ];

  const budgetHitCount = months.filter(m => m.variance >= 0).length;
  const overBudgetDays = months.filter(m => m.variance < 0).length;
  const averageVariance = months.reduce((sum, m) => sum + m.variance, 0) / months.length;

  return (
    <div className="space-y-6">
      {/* Budget Health Summary */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
          Budget This Month
        </p>
        {budgeted.length > 0 ? (
          <>
            <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
              <div>
                <p className="text-4xl font-bold text-foreground">
                  {money(Math.max(remaining, 0))}
                  <span className="text-lg font-medium text-muted-foreground"> left to spend</span>
                </p>
                {remaining < 0 && (
                  <p className="mt-1 text-sm font-semibold text-red-500">
                    {money(remaining)} over budget
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {money(totalSpent)} of {money(totalBudget)} spent
              </p>
            </div>
            <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor(overallPct)}`}
                style={{ width: `${Math.min(overallPct, 100)}%` }}
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No budgets set yet — add a monthly limit to any category below to start tracking.
          </p>
        )}
      </div>

      {/* Budgeted category cards */}
      {budgeted.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {budgeted.map((cat) => {
            const spent = spentByName.get(cat.name) || 0;
            const budget = cat.monthlyBudget || 0;
            const pct = budget > 0 ? (spent / budget) * 100 : 0;
            return (
              <div key={cat.id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: cat.color + '22' }}
                    >
                      <CategoryIcon icon={cat.icon} color={cat.color} className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">{cat.name}</p>
                  </div>
                  {editingId === cat.id ? (
                    renderBudgetEditor(cat)
                  ) : (
                    <button
                      onClick={() => startEdit(cat)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Edit budget"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  <span className="text-base font-bold text-foreground">{money(spent)}</span> of{' '}
                  {money(budget)}
                  {pct > 100 && (
                    <span className="ml-2 text-xs font-semibold text-red-500">
                      {money(spent - budget)} over
                    </span>
                  )}
                </p>
                <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor(pct)}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {pct > 100
                    ? 'Over budget'
                    : `${money(budget - spent)} remaining · ${Math.round(pct)}% used`}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Year-Long Budget Performance */}
      {budgeted.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
              Budget Performance This Year
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Months on Track</p>
                <p className="text-3xl font-bold text-emerald-600">{budgetHitCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Out of 12 months</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Months Over Budget</p>
                <p className="text-3xl font-bold text-red-500">{overBudgetDays}</p>
                <p className="text-xs text-muted-foreground mt-1">Total overspend</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Variance</p>
                <p className={`text-3xl font-bold ${averageVariance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {money(Math.abs(averageVariance))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {averageVariance >= 0 ? 'Under budget' : 'Over budget'}
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Grid */}
          <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
            {months.map((month, index) => {
              const isUnderBudget = month.variance >= 0;
              const intensity = Math.min(Math.abs(month.variance) / 300, 1); // Normalize to 0-1
              const baseColor = isUnderBudget ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'; // emerald or red
              const rgb = isUnderBudget
                ? `rgba(16, 185, 129, ${0.2 + intensity * 0.8})`
                : `rgba(239, 68, 68, ${0.2 + intensity * 0.8})`;

              return (
                <div
                  key={month.name}
                  className="relative group"
                  title={`${month.name}: ${money(month.spent)} spent of ${money(month.budget)} budget`}
                >
                  <div
                    className="aspect-square rounded-lg border border-border cursor-pointer transition-transform hover:scale-105 flex items-center justify-center"
                    style={{ backgroundColor: rgb }}
                  >
                    <span className="text-xs font-semibold text-foreground">{month.name}</span>
                  </div>

                  {/* Hover tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm text-foreground whitespace-nowrap">
                      <p className="font-semibold">{month.name} 2024</p>
                      <p className="text-xs text-muted-foreground">
                        {money(month.spent)} / {money(month.budget)}
                      </p>
                      <p className={`text-xs font-semibold mt-1 ${isUnderBudget ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isUnderBudget ? '✓ ' : '✗ '}
                        {money(Math.abs(month.variance))} {isUnderBudget ? 'under' : 'over'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-500" />
              <span className="text-muted-foreground">Under Budget</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span className="text-muted-foreground">Over Budget</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Darker = Bigger swing</span>
            </div>
          </div>
        </div>
      )}

      {/* Unbudgeted categories */}
      {unbudgeted.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              No Budget Set
            </p>
            {unbudgetedWithSuggestion.length > 1 && (
              <button
                onClick={applyAllSuggestions}
                disabled={applyingAll}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {applyingAll
                  ? 'Applying...'
                  : `Apply ${unbudgetedWithSuggestion.length} suggested budgets`}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {unbudgeted.map((cat) => {
              const spent = spentByName.get(cat.name) || 0;
              const suggested = suggestions[cat.name];
              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CategoryIcon icon={cat.icon} color={cat.color} className="w-4 h-4" />
                    <span className="text-sm text-foreground truncate">{cat.name}</span>
                    {spent > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {money(spent)} this month
                      </span>
                    )}
                  </div>
                  {editingId === cat.id ? (
                    renderBudgetEditor(cat)
                  ) : suggested > 0 ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        Suggested {money(suggested)}
                      </span>
                      <button
                        onClick={() => useSuggestion(cat)}
                        disabled={saving}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                        title="Based on your average spend in this category over the last 3 months"
                      >
                        <Sparkles className="w-3 h-3" />
                        Use
                      </button>
                      <button
                        onClick={() => startEdit(cat)}
                        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(cat)}
                      className="text-xs font-medium text-primary hover:underline flex-shrink-0"
                    >
                      Set budget
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
