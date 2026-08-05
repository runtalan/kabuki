'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Pie, PieChart, Cell, ResponsiveContainer } from 'recharts';
import { X, Loader } from 'lucide-react';
import { CategoryIcon } from '@/components/category-icon';
import { useEscapeKey } from '@/hooks/use-escape-key';

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

interface DrillTransaction {
  id: string;
  name: string;
  merchant?: string | null;
  amount: string;
  date: string;
}

function money(value: number, decimals = 0) {
  return `$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

const INITIAL_VISIBLE = 6;

export function CategoryBreakdown({
  spendingByCategory,
  budgetCategories,
  refDate,
}: {
  spendingByCategory: SpendingData[];
  budgetCategories: BudgetCategory[];
  refDate: string;
}) {
  const [tab, setTab] = useState<'expenses' | 'budget'>('expenses');
  const [expanded, setExpanded] = useState(false);
  const [drillCategory, setDrillCategory] = useState<{
    id: string;
    name: string;
    color: string;
    icon: string;
  } | null>(null);
  const [drillTxs, setDrillTxs] = useState<DrillTransaction[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  useEscapeKey(() => setDrillCategory(null), !!drillCategory);

  const expenseRows = useMemo(
    () => [...spendingByCategory].sort((a, b) => b.value - a.value),
    [spendingByCategory]
  );
  const expenseTotal = expenseRows.reduce((s, r) => s + r.value, 0);

  const budgetRows = useMemo(() => {
    const spentByName = new Map(spendingByCategory.map((s) => [s.name, s.value]));
    return budgetCategories
      .filter((c) => c.monthlyBudget && c.monthlyBudget > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
        value: spentByName.get(c.name) || 0,
        budget: c.monthlyBudget || 0,
      }))
      .sort((a, b) => b.budget - a.budget);
  }, [budgetCategories, spendingByCategory]);
  const budgetTotal = budgetRows.reduce((s, r) => s + r.budget, 0);
  const budgetSpent = budgetRows.reduce((s, r) => s + r.value, 0);

  const rows = tab === 'expenses' ? expenseRows : budgetRows;
  const total = tab === 'expenses' ? expenseTotal : budgetTotal;
  const centerValue = tab === 'expenses' ? expenseTotal : budgetSpent;
  const centerLabel = tab === 'expenses' ? 'Spent this month' : `of ${money(budgetTotal)} budget`;

  const pieData =
    tab === 'expenses'
      ? expenseRows
      : budgetRows.map((r) => ({ name: r.name, value: r.budget, color: r.color }));

  const visibleRows = expanded ? rows : rows.slice(0, INITIAL_VISIBLE);
  const hasMore = rows.length > INITIAL_VISIBLE;

  useEffect(() => {
    if (!drillCategory) return;
    setDrillLoading(true);
    setDrillTxs([]);

    const refMonth = new Date(refDate);
    const monthStart = new Date(refMonth.getFullYear(), refMonth.getMonth(), 1);
    const monthEnd = new Date(refMonth.getFullYear(), refMonth.getMonth() + 1, 1);

    fetch(`/api/transactions?category=${encodeURIComponent(drillCategory.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const all: DrillTransaction[] = data?.transactions || [];
        const inMonth = all.filter((tx) => {
          const d = new Date(tx.date);
          return d >= monthStart && d < monthEnd;
        });
        setDrillTxs(inMonth);
      })
      .finally(() => setDrillLoading(false));
  }, [drillCategory, refDate]);

  const monthLabel = new Date(refDate).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Category Breakdown
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-5 border-b border-border mb-6">
        {(['expenses', 'budget'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setExpanded(false);
            }}
            className={`pb-3 text-sm font-semibold capitalize transition-colors relative -mb-px ${
              tab === t ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
            {tab === t && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">
          {tab === 'expenses' ? (
            'No spending recorded this month yet.'
          ) : (
            <>
              No budgets set yet.{' '}
              <Link href="/spending/budget" className="text-primary hover:underline">
                Set one up
              </Link>
              .
            </>
          )}
        </p>
      ) : (
        <>
          {/* Donut chart with centered total */}
          <div className="relative w-full h-56 flex items-center justify-center mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="68%"
                  outerRadius="100%"
                  paddingAngle={pieData.length > 1 ? 2 : 0}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-8 text-center">
              <p className="text-2xl font-bold text-foreground leading-tight">
                {money(centerValue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{centerLabel}</p>
            </div>
          </div>

          {/* Category list */}
          <div className="space-y-0.5">
            {visibleRows.map((row: any) => {
              const rowTotal = tab === 'expenses' ? total : row.budget;
              const pct =
                rowTotal > 0
                  ? Math.round((row.value / (tab === 'expenses' ? total : row.budget)) * 100)
                  : 0;
              return (
                <button
                  key={row.name}
                  onClick={() =>
                    setDrillCategory({
                      id: row.id || 'uncategorized',
                      name: row.name,
                      color: row.color,
                      icon: row.icon,
                    })
                  }
                  className="w-full flex items-center justify-between py-2.5 rounded-lg hover:bg-muted/40 transition-colors -mx-2 px-2 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: row.color + '22' }}
                    >
                      <CategoryIcon icon={row.icon} color={row.color} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{row.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tab === 'expenses'
                          ? `${pct}% of expenses`
                          : row.budget > 0
                          ? `${pct}% of budget`
                          : 'No budget set'}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground flex-shrink-0 ml-2">
                    {money(row.value)}
                  </span>
                </button>
              );
            })}
          </div>

          {hasMore && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="mt-3 w-full text-center text-sm font-medium text-primary hover:underline"
            >
              {expanded ? 'Show less' : `See ${rows.length - INITIAL_VISIBLE} more`}
            </button>
          )}
        </>
      )}

      {/* Drill-in modal: this category's transactions for the viewed month */}
      {drillCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrillCategory(null)}
          />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div
              className="px-6 py-5 flex items-center justify-between"
              style={{
                background: `linear-gradient(135deg, ${drillCategory.color}22, ${drillCategory.color}08)`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${drillCategory.color}, ${drillCategory.color}cc)`,
                  }}
                >
                  <CategoryIcon icon={drillCategory.icon} className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{drillCategory.name}</h2>
                  <p className="text-xs text-muted-foreground">{monthLabel}</p>
                </div>
              </div>
              <button
                onClick={() => setDrillCategory(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto px-3 py-2">
              {drillLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading transactions...</span>
                </div>
              ) : drillTxs.length > 0 ? (
                <>
                  <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
                    <span>
                      {drillTxs.length} transaction{drillTxs.length === 1 ? '' : 's'}
                    </span>
                    <span className="font-semibold">
                      {money(drillTxs.reduce((s, tx) => s + Math.abs(parseFloat(tx.amount)), 0))}
                    </span>
                  </div>
                  {drillTxs
                    .slice()
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-muted/40 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {tx.merchant || tx.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-foreground whitespace-nowrap ml-4">
                          {money(Math.abs(parseFloat(tx.amount)), 2)}
                        </p>
                      </div>
                    ))}
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <p className="text-sm">No transactions in this category for {monthLabel}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
