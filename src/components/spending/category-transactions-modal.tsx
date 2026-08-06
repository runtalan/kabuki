'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, ArrowRight } from 'lucide-react';
import { MerchantAvatar } from '@/components/merchant-avatar';
import { CategoryIcon } from '@/components/category-icon';
import { getOwner } from '@/components/owner-badge';
import { TransactionEditModal } from '@/components/transaction-edit-modal';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { formatCurrency } from '@/lib/format';
import type { BudgetTransaction } from '@/components/spending/budget-view';

interface CategoryLike {
  id: string;
  name: string;
  color: string;
  icon: string;
}

function money(value: number) {
  return formatCurrency(Math.abs(value));
}

// Transactions page takes an explicit start/end date range, not a month
// param — derive one from "YYYY-MM" so the deep link lands pre-filtered to
// exactly the month this modal is showing.
function monthRange(monthParam: string) {
  const [year, month] = monthParam.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

// Popped open from a category card on the Budget screen — every transaction
// in that category for the month currently shown by the page's month
// toggle, so "how did we do on Dining this month?" doesn't require a trip
// to the Transactions page and re-filtering by hand.
export function CategoryTransactionsModal({
  category,
  monthLabel,
  monthParam,
  transactions,
  categories,
  onClose,
  onSaved,
}: {
  category: CategoryLike;
  monthLabel: string;
  monthParam: string;
  transactions: BudgetTransaction[];
  categories: CategoryLike[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [editingTx, setEditingTx] = useState<BudgetTransaction | null>(null);
  useEscapeKey(onClose);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const total = sorted.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0);
  const { start, end } = monthRange(monthParam);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: category.color + '22' }}
            >
              <CategoryIcon icon={category.icon} color={category.color} className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{category.name}</p>
              <p className="text-xs text-muted-foreground truncate">{monthLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between px-5 py-2.5 border-b border-border bg-muted/20 flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {sorted.length} transaction{sorted.length === 1 ? '' : 's'}
          </span>
          <span className="text-sm font-semibold text-foreground">{money(total)}</span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {sorted.length > 0 ? (
            sorted.map((tx) => (
              <button
                key={tx.id}
                onClick={() => setEditingTx(tx)}
                className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-muted/30 transition-colors text-left cursor-pointer"
                style={{ borderLeft: `3px solid ${getOwner(tx.ownerOverride || tx.account?.owner).color}` }}
              >
                <MerchantAvatar
                  logoUrl={tx.merchantLogoUrl}
                  categoryIcon={category.icon}
                  categoryColor={category.color}
                  name={tx.merchant || tx.name}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{tx.merchant || tx.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold flex-shrink-0 ${
                    tx.type === 'credit' ? 'text-emerald-500' : 'text-foreground'
                  }`}
                >
                  {tx.type === 'credit' ? '+' : '-'}
                  {money(parseFloat(tx.amount))}
                </p>
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground px-5 py-10 text-center">
              No {category.name} transactions in {monthLabel}.
            </p>
          )}
        </div>

        <Link
          href={`/spending/transactions?start=${start}&end=${end}&category=${category.id}`}
          className="flex items-center justify-center gap-1.5 px-5 py-3 border-t border-border text-xs font-medium text-primary hover:bg-muted/40 transition-colors flex-shrink-0"
        >
          View in Transactions
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {editingTx && (
        <TransactionEditModal
          transaction={editingTx}
          categories={categories}
          onClose={() => setEditingTx(null)}
          onSaved={() => {
            setEditingTx(null);
            onSaved();
          }}
        />
      )}
    </div>
  );
}
