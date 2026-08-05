'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SpendingBarChart } from './charts/spending-bar-chart';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Transaction {
  id: string;
  amount: string;
  type: 'debit' | 'credit';
  date: string;
  categoryId?: string | null;
}

export function SpendingByCategoryWidget() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => new Date());

  useEffect(() => {
    Promise.all([
      fetch('/api/transactions').then((res) => (res.ok ? res.json() : null)),
      fetch('/api/categories').then((res) => (res.ok ? res.json() : null)),
    ]).then(([txData, catData]) => {
      const txs: Transaction[] = txData?.transactions || [];
      setTransactions(txs);
      setCategories(catData?.categories || []);

      // Jump to the most recent month with activity, same rationale as the
      // spend calendar — don't default to a real-world "today" that has no data.
      const now = new Date();
      const hasCurrentMonth = txs.some((tx) => {
        const d = new Date(tx.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      });
      if (!hasCurrentMonth && txs.length > 0) {
        const mostRecent = txs.reduce(
          (latest, tx) => (new Date(tx.date) > latest ? new Date(tx.date) : latest),
          new Date(0)
        );
        setCursor(new Date(mostRecent.getFullYear(), mostRecent.getMonth(), 1));
      }
    }).finally(() => setLoading(false));
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const spendingByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== 'debit' || !tx.categoryId) continue;
      const d = new Date(tx.date);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      totals.set(tx.categoryId, (totals.get(tx.categoryId) || 0) + Math.abs(parseFloat(tx.amount)));
    }
    return categories
      .map((cat) => ({ name: cat.name, value: totals.get(cat.id) || 0, color: cat.color, icon: cat.icon }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories, year, month]);

  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          title="Previous month"
          className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-medium text-foreground min-w-36 text-center">{monthLabel}</p>
        <button
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          title="Next month"
          className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {loading ? (
        <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : (
        <SpendingBarChart data={spendingByCategory} />
      )}
    </div>
  );
}
