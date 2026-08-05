'use client';

import Link from 'next/link';
import { CategoryIcon } from '@/components/category-icon';

interface Merchant {
  name: string;
  amount: number;
  categoryIcon: string | null;
  categoryColor: string | null;
}

function money(value: number, decimals = 0) {
  return `$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function TopMerchants({ merchants }: { merchants: Merchant[] }) {
  const maxAmount = merchants[0]?.amount || 1;

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
        Top Merchants
      </p>
      {merchants.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">
          No spending recorded this period yet.
        </p>
      ) : (
        <div className="space-y-1">
          {merchants.map((merchant, i) => (
            <Link
              key={merchant.name}
              href={`/merchants/${encodeURIComponent(merchant.name)}`}
              className="flex items-center gap-3 px-2 py-2.5 -mx-2 rounded-lg hover:bg-muted/40 transition-colors group"
            >
              <span className="text-xs font-semibold text-muted-foreground w-4 flex-shrink-0 text-center">
                {i + 1}
              </span>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: (merchant.categoryColor || '#6b7280') + '22' }}
              >
                <CategoryIcon
                  icon={merchant.categoryIcon}
                  color={merchant.categoryColor}
                  className="w-4 h-4"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate group-hover:underline">
                  {merchant.name}
                </p>
                <div className="w-full h-1.5 rounded-full bg-muted/50 mt-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(merchant.amount / maxAmount) * 100}%`,
                      backgroundColor: merchant.categoryColor || '#6b7280',
                    }}
                  />
                </div>
              </div>
              <p className="text-sm font-semibold text-foreground flex-shrink-0">
                {money(merchant.amount)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
