'use client';

import { useState } from 'react';
import { OptionsOrderForm } from './options-order-form';
import { OptionsHeatmap } from './options-heatmap';
import { OptionsGuideModal } from './options-guide-modal';
import { OptionsDashboard } from './options-dashboard';
import { TickerSearch } from './ticker-search';
import type { Holding, OptionContract, OrderState } from '@/lib/options-types';

interface OptionsExplorationPageProps {
  holdings: Holding[];
  availableContracts: OptionContract[];
  currentPriceMap: Record<string, number>;
}

export function OptionsExplorationPage({
  holdings,
  availableContracts,
  currentPriceMap,
}: OptionsExplorationPageProps) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<OptionContract | null>(null);
  const [isHeatmapModalOpen, setIsHeatmapModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  const selectedHolding = holdings.find((h) => h.ticker === selectedTicker);
  const selectedContractsList = selectedTicker
    ? availableContracts.filter((c) => c.ticker === selectedTicker)
    : [];

  const handleSelectContractFromHeatmap = (
    contract: OptionContract,
    strike: number,
    expiry: Date
  ) => {
    setSelectedContract(contract);
  };

  const handleOrderSubmit = (order: OrderState) => {
    console.log('Order submitted:', order);
  };

  const handleSearchTicker = (ticker: string) => {
    setSelectedTicker(ticker);
  };

  return (
    <>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white">
            Options
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-300">
            Analyze options strategies for your holdings and optimize income generation
          </p>
        </div>

        {/* Dashboard */}
        <section>
          <OptionsDashboard holdings={holdings} contracts={availableContracts} />
        </section>

        {/* Search & Ticker Entry */}
        <section className="space-y-4">
          <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
            Search Ticker
          </label>
          <TickerSearch onSearch={handleSearchTicker} />
        </section>

        {/* Order Form */}
        {selectedTicker && selectedHolding && (
          <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-8">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-6">
              Order Builder — {selectedTicker}
            </h2>
            <OptionsOrderForm
              ticker={selectedTicker}
              currentPrice={selectedHolding.currentPrice}
              onSubmit={handleOrderSubmit}
            />
          </section>
        )}


        {/* Heatmap Modal */}
        {isHeatmapModalOpen && selectedTicker && selectedHolding && selectedContractsList.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-950">
                <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
                  Strike Heatmap — {selectedTicker}
                </h2>
                <button
                  onClick={() => setIsHeatmapModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium transition-colors"
                >
                  Close
                </button>
              </div>
              <div className="p-6">
                <OptionsHeatmap
                  ticker={selectedTicker}
                  currentPrice={selectedHolding.currentPrice}
                  contracts={selectedContractsList}
                  onSelectContract={handleSelectContractFromHeatmap}
                  openGuideModal={() => setIsGuideModalOpen(true)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedTicker && (
          <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-12 text-center">
            <div className="max-w-md mx-auto space-y-3">
              <p className="text-neutral-600 dark:text-neutral-400 font-medium">
                Search for a ticker to explore options strategies
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Enter a stock ticker above to view available options and build positions
              </p>
            </div>
          </section>
        )}
      </div>

      <OptionsGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />
    </>
  );
}
