'use client';

import { useState } from 'react';
import type { Position, PortfolioSummary } from '@/lib/alpaca-trade';

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(2);
}

interface AlpacaHoldingsViewProps {
  positions: Position[];
  portfolioSummary: PortfolioSummary;
}

export function AlpacaHoldingsView({ positions: initialPositions, portfolioSummary: initialSummary }: AlpacaHoldingsViewProps) {
  const [positions, setPositions] = useState(initialPositions);
  const [portfolioSummary, setPortfolioSummary] = useState(initialSummary);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshPortfolio = async () => {
    setIsRefreshing(true);
    try {
      const [summaryRes, positionsRes] = await Promise.all([
        fetch('/api/investments/portfolio-summary'),
        fetch('/api/investments/alpaca-positions'),
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setPortfolioSummary(data.summary || initialSummary);
      }

      if (positionsRes.ok) {
        const data = await positionsRes.json();
        setPositions(data.positions || []);
      }
    } catch (error) {
      console.error('Failed to refresh portfolio:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const totalUnrealizedPl = positions.reduce((sum, p) => sum + p.unrealizedPl, 0);
  const isPositive = totalUnrealizedPl >= 0;

  return (
    <>
      {/* Paper Trading Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 p-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Live positions are pulled from <strong>Alpaca Paper Trading</strong>. Your trades are simulated and not real.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        <p className="text-muted-foreground">View and manage your Alpaca paper trading portfolio</p>
        <button
          onClick={refreshPortfolio}
          disabled={isRefreshing}
          className="text-xs px-3 py-1 rounded bg-muted text-muted-foreground hover:bg-muted-foreground hover:text-background disabled:opacity-50"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh Portfolio'}
        </button>
      </div>

      {/* Portfolio Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg border border-border p-6 bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Portfolio Value</p>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(portfolioSummary.totalPortfolioValue)}</p>
        </div>

        <div className="rounded-lg border border-border p-6 bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Cash Available</p>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(portfolioSummary.totalCash)}</p>
        </div>

        <div className="rounded-lg border border-border p-6 bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Buying Power</p>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(portfolioSummary.buyingPower)}</p>
        </div>

        <div className="rounded-lg border border-border p-6 bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Daily P&L</p>
          <p className={`text-3xl font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}
            {formatCurrency(portfolioSummary.dailyPl)}
          </p>
          <p className={`text-xs font-semibold mt-1 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}
            {formatPercent(portfolioSummary.dailyPlpc)}%
          </p>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <h2 className="text-lg font-semibold text-foreground p-6 border-b border-border">Active Holdings</h2>

        {positions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No active positions. Start trading to build your portfolio.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Symbol
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Qty
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Current Price
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Cost Basis
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Market Value
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Unrealized P&L
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Return %
                  </th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => {
                  const isGain = position.unrealizedPl >= 0;
                  return (
                    <tr key={position.symbol} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <a
                          href={`https://www.google.com/finance/quote/${position.symbol}:NYSE`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-primary hover:underline"
                        >
                          {position.symbol}
                        </a>
                      </td>
                      <td className="text-right px-6 py-4 text-sm font-medium text-foreground">
                        {position.qty.toFixed(2)}
                      </td>
                      <td className="text-right px-6 py-4 text-sm text-foreground">
                        {formatCurrency(position.currentPrice)}
                      </td>
                      <td className="text-right px-6 py-4 text-sm text-foreground">
                        {formatCurrency(position.costBasis)}
                      </td>
                      <td className="text-right px-6 py-4 text-sm font-medium text-foreground">
                        {formatCurrency(position.marketValue)}
                      </td>
                      <td className={`text-right px-6 py-4 text-sm font-medium ${isGain ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isGain ? '+' : ''}
                        {formatCurrency(position.unrealizedPl)}
                      </td>
                      <td className={`text-right px-6 py-4 text-sm font-medium ${isGain ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isGain ? '+' : ''}
                        {formatPercent(position.unrealizedPlpc)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border p-6 bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Portfolio Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Total Unrealized P&L</span>
              <span className={`text-sm font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}
                {formatCurrency(totalUnrealizedPl)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Active Positions</span>
              <span className="text-sm font-bold text-foreground">{positions.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Total Invested</span>
              <span className="text-sm font-bold text-foreground">
                {formatCurrency(positions.reduce((sum, p) => sum + p.costBasis, 0))}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-6 bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Account Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Account Type</span>
              <span className="text-sm font-bold text-foreground">Paper Trading</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Total Invested Value</span>
              <span className="text-sm font-bold text-foreground">
                {formatCurrency(positions.reduce((sum, p) => sum + p.marketValue, 0))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Cash Available</span>
              <span className="text-sm font-bold text-foreground">
                {formatCurrency(portfolioSummary.totalCash)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
