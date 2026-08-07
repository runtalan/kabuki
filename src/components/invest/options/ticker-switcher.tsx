'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Holding } from '@/lib/options-types';

interface TickerSwitcherProps {
  holdings: Holding[];
  selectedTicker: string | null;
  onSelectTicker: (ticker: string) => void;
}

export function TickerSwitcher({
  holdings,
  selectedTicker,
  onSelectTicker,
}: TickerSwitcherProps) {
  const currentIndex = holdings.findIndex((h) => h.ticker === selectedTicker);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onSelectTicker(holdings[currentIndex - 1].ticker);
    }
  };

  const handleNext = () => {
    if (currentIndex < holdings.length - 1) {
      onSelectTicker(holdings[currentIndex + 1].ticker);
    }
  };

  if (holdings.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={handlePrevious}
        disabled={currentIndex <= 0}
        className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous ticker"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
        {currentIndex >= 0 ? `${currentIndex + 1} of ${holdings.length}` : '0 of ' + holdings.length}
      </div>

      <button
        onClick={handleNext}
        disabled={currentIndex >= holdings.length - 1 || currentIndex === -1}
        className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Next ticker"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {selectedTicker && (
        <select
          value={selectedTicker}
          onChange={(e) => onSelectTicker(e.target.value)}
          className="ml-auto px-3 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a ticker...</option>
          {holdings.map((holding) => (
            <option key={holding.ticker} value={holding.ticker}>
              {holding.ticker}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
