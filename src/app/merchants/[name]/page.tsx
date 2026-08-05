'use client';

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { AppLayout } from '@/components/app-layout';
import { CategoryIcon } from '@/components/category-icon';
import { AccountBadge } from '@/components/account-badge';
import { OwnerBadge } from '@/components/owner-badge';
import { formatNumber } from '@/lib/format';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { TransactionEditModal } from '@/components/transaction-edit-modal';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Transaction {
  id: string;
  name: string;
  merchant?: string | null;
  amount: string;
  type: 'debit' | 'credit';
  date: string;
  pending?: boolean;
  categoryId?: string | null;
  category?: Category | null;
  ownerOverride?: string | null;
  account?: {
    id: string;
    name: string;
    displayName?: string | null;
    owner?: string | null;
    mask?: string | null;
  } | null;
  tags?: { id: string; name: string; color: string }[];
}

const PALETTE = ['#0ea5e9', '#f97316', '#14b8a6', '#eab308', '#6366f1', '#ef4444', '#22c55e', '#a855f7'];
function hashColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function dayLabel(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function MerchantDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name: encodedName } = use(params);
  const merchantName = decodeURIComponent(encodedName);

  const [categories, setCategories] = useState<Category[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const fetchData = async () => {
    try {
      const [txRes, catRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/categories'),
      ]);
      if (txRes.ok) {
        const data = await txRes.json();
        setAllTransactions(data.transactions || []);
      }
      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(data.categories || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encodedName]);

  const transactions = useMemo(
    () => allTransactions.filter((tx) => (tx.merchant || tx.name) === merchantName),
    [allTransactions, merchantName]
  );

  const color = hashColor(merchantName);
  const initials = merchantName.slice(0, 2).toUpperCase();

  const monthlyData = useMemo(() => {
    const totals = new Map<string, number>();
    const now = new Date();
    // Always show a trailing 12-month window, even for months with no activity.
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short' });
      totals.set(key, 0);
    }
    for (const tx of transactions) {
      const d = new Date(tx.date);
      const key = d.toLocaleDateString('en-US', { month: 'short' });
      if (totals.has(key)) {
        totals.set(key, (totals.get(key) || 0) + Math.abs(parseFloat(tx.amount)));
      }
    }
    return Array.from(totals.entries()).map(([month, value]) => ({ name: month, value, color }));
  }, [transactions, color]);

  const groups = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const result: { label: string; items: Transaction[] }[] = [];
    const idxByLabel = new Map<string, number>();
    for (const tx of sorted) {
      const label = dayLabel(tx.date);
      if (!idxByLabel.has(label)) {
        idxByLabel.set(label, result.length);
        result.push({ label, items: [] });
      }
      result[idxByLabel.get(label)!].items.push(tx);
    }
    return result;
  }, [transactions]);

  const stats = useMemo(() => {
    if (transactions.length === 0) {
      return { total: 0, average: 0, largest: 0, totalAmount: 0 };
    }
    const amounts = transactions.map((tx) => Math.abs(parseFloat(tx.amount)));
    const totalAmount = amounts.reduce((sum, a) => sum + a, 0);
    return {
      total: transactions.length,
      average: totalAmount / transactions.length,
      largest: Math.max(...amounts),
      totalAmount,
    };
  }, [transactions]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All transactions
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {initials}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{merchantName}</h1>
        </div>

        {/* Monthly bar chart */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Last 12 Months</h2>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(v) => `$${formatNumber(v)}`}
                />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} content={<ChartTooltip />} />
                <Bar dataKey="value" name={merchantName} radius={[6, 6, 0, 0]}>
                  {monthlyData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={entry.value > 0 ? 1 : 0.15} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transactions */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">
                Transactions <span className="text-muted-foreground font-normal">({transactions.length})</span>
              </h2>
            </div>
            {groups.length > 0 ? (
              groups.map((group) => (
                <div key={group.label}>
                  <div className="px-6 py-2 bg-muted/40 border-b border-border">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </p>
                  </div>
                  {group.items.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => setEditingTx(tx)}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 cursor-pointer transition-colors border-b border-border last:border-0"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: (tx.category?.color || '#6b7280') + '1f',
                          color: tx.category?.color || '#6b7280',
                        }}
                      >
                        <CategoryIcon icon={tx.category?.icon} className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{tx.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {tx.category?.name || 'Untagged'}
                        </p>
                      </div>
                      <div className="hidden sm:block flex-shrink-0">
                        <AccountBadge account={tx.account} />
                      </div>
                      <p
                        className={`text-sm font-semibold w-24 text-right flex-shrink-0 ${
                          tx.type === 'credit' ? 'text-emerald-500' : 'text-foreground'
                        }`}
                      >
                        {tx.type === 'credit' ? '+' : ''}$
                        {Math.abs(parseFloat(tx.amount)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="px-6 py-10 text-center text-muted-foreground text-sm">
                No transactions from {merchantName} yet
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-card border border-border rounded-2xl p-6 h-fit">
            <h2 className="text-sm font-semibold text-foreground mb-4">Summary</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-sm font-semibold text-foreground">{stats.total}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Average Transaction</p>
                <p className="text-sm font-semibold text-foreground">
                  ${stats.average.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Largest Transaction</p>
                <p className="text-sm font-semibold text-foreground">
                  ${stats.largest.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <p className="text-sm font-medium text-foreground">Total Amount</p>
                <p className="text-base font-bold text-foreground">
                  ${stats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editingTx && (
        <TransactionEditModal
          transaction={editingTx}
          categories={categories}
          onClose={() => setEditingTx(null)}
          onSaved={fetchData}
        />
      )}
    </AppLayout>
  );
}
