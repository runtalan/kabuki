'use client';

import type { Holding } from '@/lib/options-types';
import { ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';

interface HoldingsTableProps {
  holdings: Holding[];
  onSelectHolding?: (ticker: string) => void;
  onViewChain?: (ticker: string) => void;
  onRoll?: (ticker: string) => void;
  onClosePosition?: (ticker: string) => void;
}

export function HoldingsTable({
  holdings,
  onSelectHolding,
  onViewChain,
  onRoll,
  onClosePosition
}: HoldingsTableProps) {
  const totalValue = holdings.reduce((sum, h) => sum + h.totalValue, 0);
  const totalPnL = holdings.reduce((sum, h) => sum + h.unrealizedPnL, 0);

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
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
          <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2">
            Total Holdings
          </p>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white">
            {holdings.length}
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
          <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2">
            Portfolio Value
          </p>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white">
            {formatCurrency(totalValue)}
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
          <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2">
            Total Unrealized P&L
          </p>
          <div className="flex items-center gap-2">
            {totalPnL >= 0 ? (
              <ArrowUpRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
            <p
              className={`text-3xl font-bold ${
                totalPnL >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatCurrency(totalPnL)}
            </p>
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-950">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                <th className="px-6 py-4 text-left font-semibold text-neutral-900 dark:text-white text-xs uppercase tracking-wider">
                  Ticker
                </th>
                <th className="px-6 py-4 text-right font-semibold text-neutral-900 dark:text-white text-xs uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-4 text-right font-semibold text-neutral-900 dark:text-white text-xs uppercase tracking-wider">
                  Avg Cost
                </th>
                <th className="px-6 py-4 text-right font-semibold text-neutral-900 dark:text-white text-xs uppercase tracking-wider">
                  Current Price
                </th>
                <th className="px-6 py-4 text-right font-semibold text-neutral-900 dark:text-white text-xs uppercase tracking-wider">
                  Position Value
                </th>
                <th className="px-6 py-4 text-right font-semibold text-neutral-900 dark:text-white text-xs uppercase tracking-wider">
                  P&L
                </th>
                <th className="px-6 py-4 text-right font-semibold text-neutral-900 dark:text-white text-xs uppercase tracking-wider">
                  Return %
                </th>
                <th className="px-6 py-4 text-right font-semibold text-neutral-900 dark:text-white text-xs uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((holding, index) => {
                const isPositive = holding.unrealizedPnL >= 0;
                const isLast = index === holdings.length - 1;

                return (
                  <tr
                    key={holding.id}
                    className={`border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer transition-colors ${
                      isLast ? 'border-b-0' : ''
                    }`}
                    onClick={() => onSelectHolding?.(holding.ticker)}
                  >
                    <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white">
                      {holding.ticker}
                    </td>
                    <td className="px-6 py-4 text-right text-neutral-600 dark:text-neutral-300">
                      {holding.quantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-neutral-600 dark:text-neutral-300">
                      {formatCurrency(holding.avgCost)}
                    </td>
                    <td className="px-6 py-4 text-right text-neutral-600 dark:text-neutral-300">
                      {formatCurrency(holding.currentPrice)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-neutral-900 dark:text-white">
                      {formatCurrency(holding.totalValue)}
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
                        <span>{formatCurrency(holding.unrealizedPnL)}</span>
                      </div>
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-semibold ${
                        isPositive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatPercent(holding.unrealizedPnLPct)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewChain?.(holding.ticker);
                          }}
                          className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
                        >
                          View Chain
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRoll?.(holding.ticker);
                          }}
                          className="px-2 py-1 text-xs rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors"
                        >
                          Roll
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onClosePosition?.(holding.ticker);
                          }}
                          className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {holdings.length === 0 && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-12 text-center">
          <p className="text-neutral-500 dark:text-neutral-400">
            No holdings yet. Start by adding a stock position to explore options strategies.
          </p>
        </div>
      )}
    </div>
  );
}
