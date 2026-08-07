'use client';

import type { OptionContract } from '@/lib/options-types';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';

interface OptionsContractsTableProps {
  contracts: OptionContract[];
  ticker: string;
  currentPrice: number;
  onSelectContract?: (contract: OptionContract, strategy: string) => void;
}

export function OptionsContractsTable({
  contracts,
  ticker,
  currentPrice,
  onSelectContract,
}: OptionsContractsTableProps) {
  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const formatPercent = (value: number, places = 2) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(places)}%`;
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'medium':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-300';
    }
  };

  const daysToExpiry = (expiryDate: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expiry = new Date(
      expiryDate.getFullYear(),
      expiryDate.getMonth(),
      expiryDate.getDate()
    );
    return Math.ceil((expiry.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  };

  const groupedByExpiry = contracts.reduce(
    (acc, contract) => {
      const expiryKey = contract.expiry.toISOString().split('T')[0];
      if (!acc[expiryKey]) {
        acc[expiryKey] = [];
      }
      acc[expiryKey].push(contract);
      return acc;
    },
    {} as Record<string, OptionContract[]>
  );

  const sortedExpiries = Object.keys(groupedByExpiry).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Available Options — {ticker}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Current price: {formatCurrency(currentPrice)}
          </p>
        </div>
      </div>

      {/* Options Table - Grouped by Expiry */}
      <div className="space-y-8">
        {sortedExpiries.map((expiryKey) => {
          const expiryContracts = groupedByExpiry[expiryKey];
          const expiryDate = new Date(expiryKey);
          const daysLeft = daysToExpiry(expiryDate);

          const callsByStrike = expiryContracts
            .filter((c) => c.optionType === 'call')
            .sort((a, b) => a.strike - b.strike);

          const putsByStrike = expiryContracts
            .filter((c) => c.optionType === 'put')
            .sort((a, b) => a.strike - b.strike);

          return (
            <div key={expiryKey} className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <h4 className="font-semibold text-neutral-900 dark:text-white">
                  {expiryDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h4>
                <Badge variant="outline" className="dark:border-neutral-700">
                  {daysLeft} DTE
                </Badge>
              </div>

              {/* Calls and Puts Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calls */}
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-950">
                  <div className="bg-neutral-50 dark:bg-neutral-900/50 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                    <h5 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      CALLS
                    </h5>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                          <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300">
                            Strike
                          </th>
                          <th className="px-3 py-2 text-right font-semibold text-neutral-700 dark:text-neutral-300">
                            Bid/Ask
                          </th>
                          <th className="px-3 py-2 text-right font-semibold text-neutral-700 dark:text-neutral-300">
                            Ann. Return
                          </th>
                          <th className="px-3 py-2 text-right font-semibold text-neutral-700 dark:text-neutral-300">
                            Delta
                          </th>
                          <th className="px-3 py-2 text-center font-semibold text-neutral-700 dark:text-neutral-300">
                            Risk
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {callsByStrike.map((contract) => {
                          const isAtMoney = Math.abs(contract.strike - currentPrice) < currentPrice * 0.05;
                          return (
                            <tr
                              key={contract.id}
                              className={`border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer transition-colors ${
                                isAtMoney ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                              }`}
                              onClick={() => onSelectContract?.(contract, 'covered_call')}
                            >
                              <td className="px-3 py-2 font-semibold text-neutral-900 dark:text-white">
                                {formatCurrency(contract.strike)}
                              </td>
                              <td className="px-3 py-2 text-right text-neutral-600 dark:text-neutral-300">
                                {formatCurrency(contract.bid)} / {formatCurrency(contract.ask)}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                {formatPercent(contract.annualizedReturn)}
                              </td>
                              <td className="px-3 py-2 text-right text-neutral-600 dark:text-neutral-300">
                                {contract.delta.toFixed(3)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Badge variant="outline" className={getRiskColor(contract.riskLevel)}>
                                  {contract.riskLevel}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Puts */}
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-950">
                  <div className="bg-neutral-50 dark:bg-neutral-900/50 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                    <h5 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      PUTS
                    </h5>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                          <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300">
                            Strike
                          </th>
                          <th className="px-3 py-2 text-right font-semibold text-neutral-700 dark:text-neutral-300">
                            Bid/Ask
                          </th>
                          <th className="px-3 py-2 text-right font-semibold text-neutral-700 dark:text-neutral-300">
                            Ann. Return
                          </th>
                          <th className="px-3 py-2 text-right font-semibold text-neutral-700 dark:text-neutral-300">
                            Delta
                          </th>
                          <th className="px-3 py-2 text-center font-semibold text-neutral-700 dark:text-neutral-300">
                            Risk
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {putsByStrike.map((contract) => {
                          const isAtMoney = Math.abs(contract.strike - currentPrice) < currentPrice * 0.05;
                          return (
                            <tr
                              key={contract.id}
                              className={`border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer transition-colors ${
                                isAtMoney ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                              }`}
                              onClick={() => onSelectContract?.(contract, 'cash_secured_put')}
                            >
                              <td className="px-3 py-2 font-semibold text-neutral-900 dark:text-white">
                                {formatCurrency(contract.strike)}
                              </td>
                              <td className="px-3 py-2 text-right text-neutral-600 dark:text-neutral-300">
                                {formatCurrency(contract.bid)} / {formatCurrency(contract.ask)}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                {formatPercent(contract.annualizedReturn)}
                              </td>
                              <td className="px-3 py-2 text-right text-neutral-600 dark:text-neutral-300">
                                {contract.delta.toFixed(3)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Badge variant="outline" className={getRiskColor(contract.riskLevel)}>
                                  {contract.riskLevel}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
