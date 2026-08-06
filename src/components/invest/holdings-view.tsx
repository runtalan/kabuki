'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { HoldingWithValue, AllocationSlice } from '@/lib/holdings';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

interface HoldingsViewProps {
  holdings: HoldingWithValue[];
  allocation: AllocationSlice[];
}

export function HoldingsView({ holdings, allocation }: HoldingsViewProps) {
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalGainLoss = holdings.reduce((sum, h) => sum + h.gainLoss, 0);
  const totalCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
  const totalGainLossPct = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
  const isGainPositive = totalGainLoss >= 0;

  return (
    <>
      <p className="text-muted-foreground mb-8">View and manage your investment portfolio</p>

      {/* Portfolio Summary */}
      <div className="rounded-lg border border-border p-6 bg-gradient-to-br from-card to-primary/5 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Portfolio Value</p>
            <p className="text-4xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
          </div>
          {holdings.length > 0 && (
            <div className="text-right">
              <p className={`text-2xl font-bold ${isGainPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {isGainPositive ? '+' : ''}
                {formatCurrency(totalGainLoss)}
              </p>
              <p className={`text-sm font-semibold ${isGainPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {isGainPositive ? '+' : ''}
                {totalGainLossPct.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Holdings Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Holdings</h2>
        {holdings.length === 0 ? (
          <div className="rounded-lg border border-border p-8 bg-card text-center text-muted-foreground text-sm">
            No holdings yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {holdings.map((holding) => {
              const isPositive = holding.gainLoss >= 0;
              return (
                <div
                  key={holding.id}
                  className="rounded-lg border border-border p-4 bg-card hover:bg-muted/20 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">{holding.symbol}</p>
                      <p className="text-xs text-muted-foreground">{holding.name}</p>
                    </div>
                    <p className="text-xs font-semibold text-right text-foreground">{holding.shares} shares</p>
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(holding.currentPrice)}/share
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(holding.currentValue)}</p>
                      <p className={`text-xs font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}
                        {formatCurrency(holding.gainLoss)} ({isPositive ? '+' : ''}
                        {holding.gainLossPct.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Portfolio Allocation */}
      <div className="rounded-lg border border-border p-6 bg-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Portfolio Allocation</h2>
        {allocation.length === 0 ? (
          <p className="text-sm text-muted-foreground">No allocation data yet.</p>
        ) : (
          <div className="flex gap-8">
            <div className="h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="assetClass"
                  >
                    {allocation.map((entry, index) => (
                      <Cell key={`cell-${entry.assetClass}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 space-y-2">
              {allocation.map((slice, index) => (
                <div key={slice.assetClass} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-xs text-muted-foreground">{slice.assetClass}</span>
                  <span className="text-xs font-semibold text-foreground ml-auto">
                    {formatCurrency(slice.value)} ({slice.pct.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
