'use client';

import { useState } from 'react';
import { HoldingsTable } from './holdings-table';
import { OptionsContractsTable } from './options-contracts-table';
import { OptionsOrderForm } from './options-order-form';
import { OptionsHeatmap } from './options-heatmap';
import { OptionsGuideModal } from './options-guide-modal';
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
  const [isHeatmapVisible, setIsHeatmapVisible] = useState(false);
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

  const handleSelectContractFromTable = (contract: OptionContract, strategy: string) => {
    setSelectedContract(contract);
  };

  const handleOrderSubmit = (order: OrderState) => {
    console.log('Order submitted:', order);
    // TODO: Send order to API/backend
  };

  return (
    <>
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-white">
          Options Exploration
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-300">
          Analyze options strategies for your holdings and optimize income generation
        </p>
      </div>

      {/* Phase 1: Holdings Analysis */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
          Your Holdings
        </h2>
        <HoldingsTable holdings={holdings} onSelectHolding={setSelectedTicker} />
      </section>

      {/* Phase 2: Order Form */}
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

      {/* Phase 1: Options Contracts Table */}
      {selectedTicker && selectedContractsList.length > 0 && selectedHolding && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
            Available Strategies
          </h2>
          <OptionsContractsTable
            contracts={selectedContractsList}
            ticker={selectedTicker}
            currentPrice={selectedHolding.currentPrice}
            onSelectContract={handleSelectContractFromTable}
          />
        </section>
      )}

      {/* Phase 3: Strike Heatmap */}
      {selectedTicker && selectedHolding && (
        <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
              Strike Heat Map — {selectedTicker}
            </h2>
            <button
              onClick={() => setIsHeatmapVisible(!isHeatmapVisible)}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
            >
              {isHeatmapVisible ? 'Hide Heatmap' : 'View Heatmap'}
            </button>
          </div>

          {isHeatmapVisible && selectedContractsList.length > 0 && (
            <OptionsHeatmap
              ticker={selectedTicker}
              currentPrice={selectedHolding.currentPrice}
              contracts={selectedContractsList}
              onSelectContract={handleSelectContractFromHeatmap}
              openGuideModal={() => setIsGuideModalOpen(true)}
            />
          )}

          {!isHeatmapVisible && (
            <div className="flex items-center justify-center py-12 text-neutral-500 dark:text-neutral-400">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Click "View Heatmap" to explore strike prices and expirations</p>
                <p className="text-xs">
                  See returns by strike and expiration at a glance
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Empty State */}
      {!selectedTicker && (
        <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-12 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <p className="text-neutral-600 dark:text-neutral-400 font-medium">
              Select a holding to explore options strategies
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Click any ticker in the table above to view available options and build positions
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
