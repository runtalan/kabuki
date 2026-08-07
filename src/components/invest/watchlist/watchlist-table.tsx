'use client';

import type { WatchlistItem } from '@/lib/mock-watchlist-data';
import { ArrowUpRight, ArrowDownRight, Trash2 } from 'lucide-react';

interface WatchlistTableProps {
  items: WatchlistItem[];
  onRemove?: (ticker: string) => void;
  onSelect?: (ticker: string) => void;
}

export function WatchlistTable({ items, onRemove, onSelect }: WatchlistTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-950">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
              <th className="px-6 py-4 text-left font-semibold text-neutral-900 dark:text-white text-xs uppercase tracking-wider">
                Ticker
              </th>
              <th className="px-6 py-4 text-left font-semibold text-neutral-900 dark:text-white text-xs uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-4 text-right font-semibold text-neutral-900 dark:text-white text-xs uppercase tracking-wider">
                Current Price
              </th>
              <th className="px-6 py-4 text-right font-semibold text-neutral-900 dark:text-white text-xs uppercase tracking-wider">
                Previous Close
              </th>
              <th className="px-6 py-4 text-right font-semibold text-neutral-900 dark:text-white text-xs uppercase tracking-wider">
                Day Change
              </th>
              <th className="px-6 py-4 text-right font-semibold text-neutral-900 dark:text-white text-xs uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const isPositive = item.dayChange >= 0;
              const isLast = index === items.length - 1;

              return (
                <tr
                  key={item.id}
                  className={`border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer transition-colors ${
                    isLast ? 'border-b-0' : ''
                  }`}
                  onClick={() => onSelect?.(item.ticker)}
                >
                  <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white">
                    {item.ticker}
                  </td>
                  <td className="px-6 py-4 text-neutral-600 dark:text-neutral-300">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-neutral-900 dark:text-white">
                    {formatCurrency(item.currentPrice)}
                  </td>
                  <td className="px-6 py-4 text-right text-neutral-600 dark:text-neutral-300">
                    {formatCurrency(item.previousClose)}
                  </td>
                  <td
                    className={`px-6 py-4 text-right font-semibold ${
                      isPositive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {isPositive ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      <span>{formatCurrency(item.dayChange)}</span>
                      <span>({formatPercent(item.dayChangePercent)})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove?.(item.ticker);
                      }}
                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-950 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-12 text-center">
          <p className="text-neutral-500 dark:text-neutral-400">
            No items in your watch list yet. Add tickers to track their performance.
          </p>
        </div>
      )}
    </div>
  );
}
