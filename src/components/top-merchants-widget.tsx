'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/format';

interface Transaction {
  id: string;
  name: string;
  merchant?: string | null;
  amount: string;
  type: 'debit' | 'credit';
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

export function TopMerchantsWidget() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/transactions')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setTransactions(data.transactions || []))
      .finally(() => setLoading(false));
  }, []);

  const topMerchants = useMemo(() => {
    const totals = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== 'debit') continue;
      const key = tx.merchant || tx.name;
      totals.set(key, (totals.get(key) || 0) + Math.abs(parseFloat(tx.amount)));
    }
    return Array.from(totals.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions]);

  const maxAmount = topMerchants[0]?.amount || 1;

  if (loading) {
    return <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  }

  if (topMerchants.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
        No spending yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {topMerchants.map((merchant, i) => {
        const color = hashColor(merchant.name);
        return (
          <Link
            key={merchant.name}
            href={`/merchants/${encodeURIComponent(merchant.name)}`}
            className="flex items-center gap-3 group"
          >
            <span className="text-xs font-semibold text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: color }}
            >
              {merchant.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate group-hover:underline">
                {merchant.name}
              </p>
              <div className="w-full h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(merchant.amount / maxAmount) * 100}%`, backgroundColor: color }}
                />
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground flex-shrink-0">
              {formatCurrency(merchant.amount)}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
