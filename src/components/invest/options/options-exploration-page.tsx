'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { OptionsOrderForm } from './options-order-form';
import { OptionsHeatmap } from './options-heatmap';
import { OptionsGuideModal } from './options-guide-modal';
import { OptionsDashboard } from './options-dashboard';
import { TickerSearch } from './ticker-search';
import { TickerSwitcher } from './ticker-switcher';
import { WatchlistTable } from '../watchlist/watchlist-table';
import { useWatchList } from '@/lib/watch-list-context';
import { generateMockStockData } from '@/lib/ticker-data';
import { generateMockOptionContracts } from '@/lib/mock-options-data';
import type { Holding, OptionContract, OrderState } from '@/lib/options-types';

interface OptionsExplorationPageProps {
  holdings: Holding[];
  availableContracts: OptionContract[];
  currentPriceMap: Record<string, number>;
  initialTicker?: string;
}

export function OptionsExplorationPage({
  holdings,
  availableContracts,
  currentPriceMap,
  initialTicker,
}: OptionsExplorationPageProps) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(initialTicker || null);
  const [selectedContract, setSelectedContract] = useState<OptionContract | null>(null);
  const [isHeatmapModalOpen, setIsHeatmapModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [selectedExpiry, setSelectedExpiry] = useState<Date | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const { watchList } = useWatchList();
  const orderFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedTicker && orderFormRef.current) {
      orderFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedTicker]);

  useEffect(() => {
    if (showFeedback) {
      const timer = setTimeout(() => setShowFeedback(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [showFeedback]);

  const watchListItems = useMemo(() => {
    return watchList.map((ticker) => generateMockStockData(ticker));
  }, [watchList]);

  const selectedHolding = useMemo(() => {
    if (!selectedTicker) return null;

    // First check if it's in actual holdings
    const holding = holdings.find((h) => h.ticker === selectedTicker);
    if (holding) return holding;

    // If not, create a temporary holding for exploration
    const stockData = generateMockStockData(selectedTicker);
    return {
      id: selectedTicker,
      ticker: selectedTicker,
      assetType: 'stock' as const,
      quantity: 0,
      avgCost: 0,
      currentPrice: stockData.currentPrice,
      totalValue: 0,
      unrealizedPnL: 0,
      unrealizedPnLPct: 0,
    };
  }, [selectedTicker, holdings]);

  const selectedContractsList = useMemo(() => {
    if (!selectedTicker) return [];

    // Check if contracts are in availableContracts
    let contracts = availableContracts.filter((c) => c.ticker === selectedTicker);

    // If no contracts, generate them for this ticker
    if (contracts.length === 0) {
      contracts = generateMockOptionContracts(selectedTicker);
    }

    return contracts;
  }, [selectedTicker, availableContracts]);

  const handleSelectContractFromHeatmap = (
    contract: OptionContract,
    strike: number,
    expiry: Date
  ) => {
    setSelectedContract(contract);
    setSelectedExpiry(expiry);
    setShowFeedback(true);

    // Flash effect and scroll up
    if (orderFormRef.current) {
      orderFormRef.current.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
      orderFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });

      setTimeout(() => {
        orderFormRef.current?.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
      }, 1500);
    }
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

        {/* Ticker Switcher */}
        <TickerSwitcher
          holdings={holdings}
          selectedTicker={selectedTicker}
          onSelectTicker={handleSearchTicker}
        />

        {/* Watch List Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
              Watch List
            </h2>
            <a
              href="/invest/watchlist"
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Manage Watch List →
            </a>
          </div>
          {watchListItems.length > 0 ? (
            <WatchlistTable
              items={watchListItems}
              onSelect={(ticker) => handleSearchTicker(ticker)}
            />
          ) : (
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-8 text-center">
              <p className="text-neutral-600 dark:text-neutral-400">
                No tickers in watch list. Add some using the star icon to see them here.
              </p>
            </div>
          )}
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
          <section ref={orderFormRef} className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-8">
            {showFeedback && (
              <div
                className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm font-medium animate-fade-out"
                style={{
                  animation: 'fadeOut 1s ease-out forwards',
                }}
              >
                <style>{`
                  @keyframes fadeOut {
                    0% { opacity: 1; }
                    100% { opacity: 0; }
                  }
                `}</style>
                ✓ Form pre-filled from heatmap selection
              </div>
            )}
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-6">
              Order Builder — {selectedTicker}
            </h2>
            <OptionsOrderForm
              ticker={selectedTicker}
              currentPrice={selectedHolding.currentPrice}
              onSubmit={handleOrderSubmit}
              onExpiryChange={setSelectedExpiry}
              prefilledStrike={selectedContract?.strike}
              prefilledExpiry={selectedExpiry || undefined}
              onClearPrefill={() => {
                setSelectedContract(null);
                setSelectedExpiry(null);
              }}
            />
          </section>
        )}

        {/* Options Heatmap */}
        {selectedTicker && selectedHolding && selectedContractsList.length > 0 && (
          <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-8">
            <OptionsHeatmap
              ticker={selectedTicker}
              currentPrice={selectedHolding.currentPrice}
              contracts={selectedContractsList}
              onSelectContract={handleSelectContractFromHeatmap}
              openGuideModal={() => setIsGuideModalOpen(true)}
              selectedExpiry={selectedExpiry}
            />
          </section>
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
