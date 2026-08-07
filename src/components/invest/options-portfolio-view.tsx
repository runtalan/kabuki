'use client';

import type { HoldingWithValue } from '@/lib/holdings';
import { Tooltip } from '@/components/ui/tooltip';

interface OptionsPortfolioViewProps {
  holdings: HoldingWithValue[];
}

const STRATEGY_GUIDE = {
  bullish: [
    { name: 'Call Spread', description: 'Lower risk, defined max profit' },
    { name: 'Bull Call Spread', description: 'Moderate bullish outlook' },
    { name: 'Covered Call', description: 'Generate income on holdings' },
  ],
  bearish: [
    { name: 'Put Spread', description: 'Lower risk, defined max profit' },
    { name: 'Bear Call Spread', description: 'Moderate bearish outlook' },
    { name: 'Iron Condor', description: 'Neutral outlook, high probability' },
  ],
};

export function OptionsPortfolioView({ holdings }: OptionsPortfolioViewProps) {
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalGainLoss = holdings.reduce((sum, h) => sum + h.gainLoss, 0);

  return (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-border p-4 bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total Positions</p>
          <p className="text-2xl font-bold text-foreground">{holdings.length}</p>
        </div>
        <div className="rounded-lg border border-border p-4 bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Portfolio Value</p>
          <p className="text-2xl font-bold text-foreground">${totalValue.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-border p-4 bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total P&L</p>
          <p className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {totalGainLoss >= 0 ? '+' : ''}{totalGainLoss.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card mb-8">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-foreground text-xs">Symbol</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Shares</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Current Price</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Value</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Gain/Loss</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => {
              const isPositive = holding.gainLoss >= 0;
              return (
                <tr key={holding.id} className="border-b border-border hover:bg-muted/20 last:border-0">
                  <td className="px-4 py-3 font-bold text-foreground">{holding.symbol}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{holding.shares}</td>
                  <td className="px-4 py-3 text-right text-foreground">${holding.currentPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">
                    ${holding.currentValue.toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isPositive ? '+' : ''}{holding.gainLoss.toFixed(2)} ({isPositive ? '+' : ''}
                    {holding.gainLossPct.toFixed(2)}%)
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Strategy Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border p-6 bg-card">
          <h3 className="font-semibold text-foreground mb-4">Bullish Strategies</h3>
          <div className="space-y-3">
            {STRATEGY_GUIDE.bullish.map((strategy) => (
              <div key={strategy.name}>
                <p className="text-sm font-medium text-foreground">{strategy.name}</p>
                <p className="text-xs text-muted-foreground">{strategy.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border p-6 bg-card">
          <h3 className="font-semibold text-foreground mb-4">Bearish Strategies</h3>
          <div className="space-y-3">
            {STRATEGY_GUIDE.bearish.map((strategy) => (
              <div key={strategy.name}>
                <p className="text-sm font-medium text-foreground">{strategy.name}</p>
                <p className="text-xs text-muted-foreground">{strategy.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
