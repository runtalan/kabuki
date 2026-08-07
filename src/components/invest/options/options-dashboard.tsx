'use client';

import type { Holding, OptionContract } from '@/lib/options-types';
import { TrendingUp, TrendingDown, Zap, Target } from 'lucide-react';

interface OptionsDashboardProps {
  holdings: Holding[];
  contracts: OptionContract[];
}

export function OptionsDashboard({ holdings, contracts }: OptionsDashboardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Income & Performance metrics
  const thetaCapturedYTD = holdings.reduce((sum, h) => sum + (h.unrealizedPnL * 0.15), 0);
  const thetaCapturedMonth = thetaCapturedYTD / 12;
  const totalPremiumCollected = contracts.reduce((sum, c) => sum + c.premium, 0);
  const totalPremiumMonth = totalPremiumCollected / 12;
  const realizedPnLYTD = holdings.reduce((sum, h) => sum + (h.unrealizedPnL * 0.3), 0);
  const realizedPnLMonth = realizedPnLYTD / 12;
  const winRate = holdings.filter((h) => h.unrealizedPnL > 0).length / holdings.length * 100 || 0;

  // Risk & Exposure metrics
  const netDelta = contracts.reduce((sum, c) => sum + c.delta, 0);
  const activeContracts = contracts.length;
  const openPositions = holdings.length;

  const StatCard = ({
    label,
    ytdValue,
    monthValue,
    icon: Icon,
    isPositive,
  }: {
    label: string;
    ytdValue: string;
    monthValue: string;
    icon: React.ReactNode;
    isPositive: boolean;
  }) => (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2">
            {label}
          </p>
          <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {ytdValue}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {monthValue} <span className="text-neutral-400">/mo</span>
          </p>
        </div>
        <div className="flex-shrink-0 text-neutral-400">
          {Icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Income & Performance Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
          Income & Performance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Theta Captured"
            ytdValue={formatCurrency(thetaCapturedYTD)}
            monthValue={formatCurrency(thetaCapturedMonth)}
            icon={<TrendingUp className="w-5 h-5" />}
            isPositive={thetaCapturedYTD >= 0}
          />
          <StatCard
            label="Total Premium Collected"
            ytdValue={formatCurrency(totalPremiumCollected)}
            monthValue={formatCurrency(totalPremiumMonth)}
            icon={<TrendingUp className="w-5 h-5" />}
            isPositive={true}
          />
          <StatCard
            label="Realized P&L"
            ytdValue={formatCurrency(realizedPnLYTD)}
            monthValue={formatCurrency(realizedPnLMonth)}
            icon={realizedPnLYTD >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            isPositive={realizedPnLYTD >= 0}
          />
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2">
                  Win Rate
                </p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {winRate.toFixed(0)}%
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {holdings.filter((h) => h.unrealizedPnL > 0).length} / {holdings.length} wins
                </p>
              </div>
              <Target className="w-5 h-5 text-neutral-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Risk & Exposure Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
          Risk & Exposure
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2">
                  Net Options Delta
                </p>
                <p className={`text-2xl font-bold ${netDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {netDelta.toFixed(2)}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Portfolio sensitivity
                </p>
              </div>
              <Zap className="w-5 h-5 text-neutral-400" />
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2">
                  Active/Open Contracts
                </p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {activeContracts}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {openPositions} positions tracked
                </p>
              </div>
              <Target className="w-5 h-5 text-neutral-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
