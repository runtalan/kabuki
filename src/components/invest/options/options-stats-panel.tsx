'use client';

import type { OptionContract } from '@/lib/options-types';

interface OptionsStatsPanelProps {
  ticker: string;
  currentPrice: number;
  contracts: OptionContract[];
  selectedExpiry?: Date | null;
}

export function OptionsStatsPanel({
  ticker,
  currentPrice,
  contracts,
  selectedExpiry,
}: OptionsStatsPanelProps) {
  const filteredContracts = selectedExpiry
    ? contracts.filter((c) => Math.abs(c.expiry.getTime() - selectedExpiry.getTime()) < 86400000)
    : contracts;

  const callContracts = filteredContracts.filter((c) => c.optionType === 'call');
  const putContracts = filteredContracts.filter((c) => c.optionType === 'put');

  const avgCallPremium = callContracts.length > 0
    ? callContracts.reduce((sum, c) => sum + c.premium, 0) / callContracts.length
    : 0;

  const avgPutPremium = putContracts.length > 0
    ? putContracts.reduce((sum, c) => sum + c.premium, 0) / putContracts.length
    : 0;

  const avgAnnualizedReturn = filteredContracts.length > 0
    ? filteredContracts.reduce((sum, c) => sum + c.annualizedReturn, 0) / filteredContracts.length
    : 0;

  const totalVolume = filteredContracts.reduce((sum, c) => sum + c.volume, 0);

  const daysToExpiry = selectedExpiry
    ? Math.ceil((selectedExpiry.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
    : 0;

  const stats = [
    { label: 'Current Price', value: `$${currentPrice.toFixed(2)}` },
    { label: 'Calls', value: `${callContracts.length}` },
    { label: 'Puts', value: `${putContracts.length}` },
    { label: 'Avg Call Premium', value: `$${avgCallPremium.toFixed(2)}` },
    { label: 'Avg Put Premium', value: `$${avgPutPremium.toFixed(2)}` },
    { label: 'Avg Annual Return', value: `${avgAnnualizedReturn.toFixed(1)}%` },
    ...(selectedExpiry ? [{ label: 'Days to Expiry', value: `${daysToExpiry}d` }] : []),
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 text-center"
        >
          <div className="text-xs text-neutral-600 dark:text-neutral-400 font-medium mb-1">
            {stat.label}
          </div>
          <div className="text-sm font-semibold text-neutral-900 dark:text-white">
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
