'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { MerchantAvatar } from '@/components/merchant-avatar';
import { CategoryIcon } from '@/components/category-icon';
import { getOwner } from '@/components/owner-badge';
import { TransactionEditModal } from '@/components/transaction-edit-modal';
import { CashFlowChart } from '@/components/charts/cash-flow-chart';
import { formatCurrency } from '@/lib/format';

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

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Transaction {
  id: string;
  name: string;
  merchant?: string | null;
  merchantLogoUrl?: string | null;
  amount: string;
  type: 'debit' | 'credit';
  date: string;
  pending?: boolean;
  hidden?: boolean;
  categoryId?: string | null;
  category?: Category | null;
  ownerOverride?: string | null;
  tags?: Tag[];
  account?: {
    id: string;
    name: string;
    displayName?: string | null;
    owner?: string | null;
    mask?: string | null;
    isManual?: boolean | null;
  } | null;
}

function TransactionRow({ tx, onClick }: { tx: Transaction; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-left cursor-pointer"
      style={{ borderLeft: `3px solid ${getOwner(tx.ownerOverride || tx.account?.owner).color}` }}
    >
      <MerchantAvatar
        logoUrl={tx.merchantLogoUrl}
        categoryIcon={tx.category?.icon}
        categoryColor={tx.category?.color}
        name={tx.merchant || tx.name}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{tx.merchant || tx.name}</p>
        <div className="flex items-center gap-1.5 min-w-0">
          <CategoryIcon icon={tx.category?.icon} color={tx.category?.color} className="w-3 h-3 flex-shrink-0" />
          <p
            className="text-[11px] font-medium truncate"
            style={{ color: tx.category?.color || '#9ca3af' }}
          >
            {tx.category?.name || 'Untagged'}
          </p>
          <span className="text-[11px] text-muted-foreground/60">·</span>
          <p className="text-[11px] text-muted-foreground whitespace-nowrap">
            {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>
      <p
        className={`text-sm font-semibold flex-shrink-0 ${
          tx.type === 'credit' ? 'text-emerald-500' : 'text-foreground'
        }`}
      >
        {tx.type === 'credit' ? '+' : '-'}
        {formatCurrency(Math.abs(parseFloat(tx.amount)))}
      </p>
    </button>
  );
}

export function CashFlowView({
  transactions,
  categories,
  series,
}: {
  transactions: Transaction[];
  categories: Category[];
  series: MonthPoint[];
}) {
  const router = useRouter();
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const monthLabel = useMemo(
    () => new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    []
  );

  const income = useMemo(
    () =>
      transactions
        .filter((tx) => tx.type === 'credit')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]
  );
  const expenses = useMemo(
    () =>
      transactions
        .filter((tx) => tx.type === 'debit')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]
  );

  const incomeTotal = income.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0);
  const expenseTotal = expenses.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0);
  const net = incomeTotal - expenseTotal;

  return (
    <div>
      {/* Monthly cash flow chart */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Cash Flow History
        </p>
        <CashFlowChart series={series} />
      </div>

      {/* Summary bar */}
      <div className="bg-card border border-border rounded-xl mb-6 grid grid-cols-3 divide-x divide-border overflow-hidden">
        <div className="px-5 py-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            {monthLabel}
          </p>
          <p className="text-sm font-semibold text-foreground">
            {transactions.length} transaction{transactions.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            Total income
          </p>
          <p className="text-sm font-semibold text-emerald-500">+{formatCurrency(incomeTotal)}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Net</p>
          <p className={`text-sm font-semibold ${net >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {net >= 0 ? '+' : '-'}
            {formatCurrency(Math.abs(net))}
          </p>
        </div>
      </div>

      {/* Two-column income / expense table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" /> Income
            </span>
            <span className="text-xs font-semibold text-emerald-500">+{formatCurrency(incomeTotal)}</span>
          </div>
          <div className="divide-y divide-border">
            {income.length > 0 ? (
              income.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} onClick={() => setEditingTx(tx)} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground px-4 py-8 text-center">
                No income transactions this month.
              </p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <ArrowUpRight className="w-3.5 h-3.5 text-red-500" /> Expenses
            </span>
            <span className="text-xs font-semibold text-red-500">-{formatCurrency(expenseTotal)}</span>
          </div>
          <div className="divide-y divide-border">
            {expenses.length > 0 ? (
              expenses.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} onClick={() => setEditingTx(tx)} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground px-4 py-8 text-center">
                No expense transactions this month.
              </p>
            )}
          </div>
        </div>
      </div>

      {editingTx && (
        <TransactionEditModal
          transaction={editingTx}
          categories={categories}
          onClose={() => setEditingTx(null)}
          onSaved={() => {
            setEditingTx(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
