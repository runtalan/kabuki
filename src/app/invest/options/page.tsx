'use client';

import { Search } from 'lucide-react';

import { AppLayout } from '@/components/app-layout';
import { Tooltip } from '@/components/ui/tooltip';

const OPTIONS_PLAYS = [
  { symbol: 'AAPL', strategy: 'Call Spread', strike: '$230/$235', expiry: '08/16', premium: '-$45', roi: '+180%', status: 'Open' as const },
  { symbol: 'MSFT', strategy: 'Put Spread', strike: '$420/$410', expiry: '08/23', premium: '+$65', roi: '+32%', status: 'Open' as const },
  { symbol: 'SPY', strategy: 'Iron Condor', strike: '480/485/475/470', expiry: '08/30', premium: '+$120', roi: '+18%', status: 'Open' as const },
  { symbol: 'NVDA', strategy: 'Covered Call', strike: '$900', expiry: '09/20', premium: '+$85', roi: '+7.2%', status: 'Assigned' as const },
  { symbol: 'TSLA', strategy: 'Long Straddle', strike: '$245', expiry: '09/08', premium: '-$120', roi: '-45%', status: 'Open' as const },
];

export default function OptionsPage() {
  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Options</h1>
        <p className="text-muted-foreground mb-8">Manage your options positions and derivatives strategies</p>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search options plays..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground"
            disabled
          />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-lg border border-border p-4 bg-card">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total Positions</p>
            <p className="text-2xl font-bold text-foreground">{OPTIONS_PLAYS.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{OPTIONS_PLAYS.filter(o => o.status === 'Open').length} open</p>
          </div>
          <div className="rounded-lg border border-border p-4 bg-card">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total Premium Collected</p>
            <p className="text-2xl font-bold text-emerald-600">+$225</p>
            <p className="text-xs text-muted-foreground mt-1">From closed trades</p>
          </div>
          <div className="rounded-lg border border-border p-4 bg-card">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Win Rate</p>
            <p className="text-2xl font-bold text-foreground">72%</p>
            <p className="text-xs text-muted-foreground mt-1">24 / 33 trades</p>
          </div>
          <div className="rounded-lg border border-border p-4 bg-card">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Max Profit Potential</p>
            <p className="text-2xl font-bold text-foreground">+$2,840</p>
            <p className="text-xs text-muted-foreground mt-1">If all expire ITM</p>
          </div>
        </div>

        {/* Options Table */}
        <div className="rounded-lg border border-border overflow-hidden bg-card mb-8">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground text-xs">Symbol</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground text-xs">Strategy</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground text-xs">Strike</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground text-xs">Expiry</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Premium</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">ROI</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {OPTIONS_PLAYS.map((opt, i) => (
                <tr key={i} className="border-b border-border hover:bg-muted/20 cursor-pointer transition-colors last:border-0">
                  <td className="px-4 py-3 font-bold text-foreground">{opt.symbol}</td>
                  <td className="px-4 py-3 text-foreground">{opt.strategy}</td>
                  <td className="px-4 py-3 text-muted-foreground">{opt.strike}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{opt.expiry}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${opt.premium.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>
                    {opt.premium}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${opt.roi.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>
                    {opt.roi}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      opt.status === 'Open'
                        ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    }`}>
                      {opt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Strategy Guide */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border border-border p-6 bg-card">
            <Tooltip
              content={
                <div className="space-y-1">
                  <p className="font-semibold text-emerald-600">Bullish Execution</p>
                  <p className="text-muted-foreground">
                    Buy calls to profit from upside, or sell cash-secured puts to collect premium while targeting a
                    lower entry price.
                  </p>
                </div>
              }
            >
              <h3 className="font-semibold text-foreground mb-4 inline-flex items-center gap-1.5 rounded-md px-1 -mx-1 bg-emerald-500/10">
                Bullish Strategies
              </h3>
            </Tooltip>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Call Spread</p>
                <p className="text-xs text-muted-foreground">Lower risk, defined max profit</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Bull Call Spread</p>
                <p className="text-xs text-muted-foreground">Moderate bullish outlook</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Covered Call</p>
                <p className="text-xs text-muted-foreground">Generate income on holdings</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border p-6 bg-card">
            <Tooltip
              content={
                <div className="space-y-1">
                  <p className="font-semibold text-red-600">Bearish Execution</p>
                  <p className="text-muted-foreground">
                    Buy puts to profit from downside, or sell covered calls against existing shares to collect
                    premium while capping upside.
                  </p>
                </div>
              }
            >
              <h3 className="font-semibold text-foreground mb-4 inline-flex items-center gap-1.5 rounded-md px-1 -mx-1 bg-red-500/10">
                Bearish Strategies
              </h3>
            </Tooltip>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Put Spread</p>
                <p className="text-xs text-muted-foreground">Lower risk, defined max profit</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Bear Call Spread</p>
                <p className="text-xs text-muted-foreground">Moderate bearish outlook</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Iron Condor</p>
                <p className="text-xs text-muted-foreground">Neutral outlook, high probability</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
