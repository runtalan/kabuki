'use client';

import type { HoldingWithValue } from '@/lib/holdings';
import { TickerWatchListButton } from '../ticker-watch-list-button';

interface CurrentHoldingsForTradingProps {
  holdings: HoldingWithValue[];
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function CurrentHoldingsForTrading({ holdings }: CurrentHoldingsForTradingProps) {
  if (holdings.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground text-sm">
        No current holdings. Start by buying your first position.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-foreground text-xs">Symbol</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Shares</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Acquired</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Cost Basis</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Current Price</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Current Value</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Gain/Loss</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => {
            const isPositive = holding.gainLoss >= 0;
            const acquiredDate = new Date(holding.acquisitionDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            return (
              <tr key={holding.id} className="border-b border-border hover:bg-muted/20 last:border-0">
                <td className="px-4 py-3 font-bold text-foreground">
                  <div className="flex items-center gap-2">
                    {holding.symbol}
                    <TickerWatchListButton ticker={holding.symbol} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {holding.shares.toFixed(4)}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                  {acquiredDate}
                </td>
                <td className="px-4 py-3 text-right text-foreground">
                  {formatCurrency(holding.costBasis)}
                </td>
                <td className="px-4 py-3 text-right text-foreground">
                  {formatCurrency(holding.currentPrice)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-foreground">
                  {formatCurrency(holding.currentValue)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    isPositive ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {isPositive ? '+' : ''}{formatCurrency(holding.gainLoss)} (
                  {isPositive ? '+' : ''}{holding.gainLossPct.toFixed(2)}%)
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
