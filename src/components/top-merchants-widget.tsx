'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/format';
import { MerchantAvatar } from '@/components/merchant-avatar';

interface Transaction {
  id: string;
  name: string;
  merchant?: string | null;
  merchantLogoUrl?: string | null;
  amount: string;
  type: 'debit' | 'credit';
  category?: { icon: string | null; color: string | null } | null;
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
    const totals = new Map<
      string,
      { amount: number; logoUrl: string | null; categoryIcon: string | null; categoryColor: string | null }
    >();
    for (const tx of transactions) {
      if (tx.type !== 'debit') continue;
      const key = tx.merchant || tx.name;
      const existing = totals.get(key);
      totals.set(key, {
        amount: (existing?.amount || 0) + Math.abs(parseFloat(tx.amount)),
        logoUrl: existing?.logoUrl ?? tx.merchantLogoUrl ?? null,
        categoryIcon: existing?.categoryIcon ?? tx.category?.icon ?? null,
        categoryColor: existing?.categoryColor ?? tx.category?.color ?? null,
      });
    }
    return Array.from(totals.entries())
      .map(([name, v]) => ({ name, ...v }))
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
        const color = merchant.categoryColor || '#6b7280';
        return (
          <Link
            key={merchant.name}
            href={`/merchants/${encodeURIComponent(merchant.name)}`}
            className="flex items-center gap-3 group"
          >
            <span className="text-xs font-semibold text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
            <MerchantAvatar
              logoUrl={merchant.logoUrl}
              categoryIcon={merchant.categoryIcon}
              categoryColor={merchant.categoryColor}
              name={merchant.name}
            />
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
