'use client';

import { useState, useRef } from 'react';
import { HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type {
  OptionContract,
  OptionsHeatmapProps,
  HeatmapFilterState,
  MetricMode,
  MoneynessCategoryFilter,
  HeatmapCellData,
} from '@/lib/options-types';

interface OptionsHeatmapWithExpiryProps extends OptionsHeatmapProps {
  selectedExpiry?: Date | null;
}

export function OptionsHeatmap({
  ticker,
  currentPrice,
  contracts,
  onSelectContract,
  openGuideModal,
  selectedExpiry,
}: OptionsHeatmapWithExpiryProps) {
  const [filters, setFilters] = useState<HeatmapFilterState>({
    optionType: 'both',
    metricMode: 'premium',
    moneynessFilter: 'all',
  });
  const [selectedDTE, setSelectedDTE] = useState<7 | 14 | 30 | 45 | null>(7);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Helper Functions

  function getMoneyness(strike: number, currentPriceVal: number): 'itm' | 'atm' | 'otm' {
    const distance = Math.abs(strike - currentPriceVal) / currentPriceVal;
    if (distance < 0.01) return 'atm';
    return strike < currentPriceVal ? 'itm' : 'otm';
  }

  function getRiskColor(annualizedYield: number): string {
    if (annualizedYield > 60) return 'bg-pink-100 dark:bg-pink-950/30';
    if (annualizedYield > 30) return 'bg-yellow-100 dark:bg-yellow-950/30';
    return 'bg-emerald-100 dark:bg-emerald-950/30';
  }

  function getMetricLabel(mode: MetricMode): string {
    const labels: Record<MetricMode, string> = {
      premium: 'Premium',
      ari: 'ARI',
      delta: 'Delta',
    };
    return labels[mode];
  }

  function formatMetricValue(value: number, mode: MetricMode): string {
    if (mode === 'delta') {
      return value.toFixed(2);
    }
    if (mode === 'ari') {
      return `${(value * 100).toFixed(2)}%`;
    }
    return `$${value.toFixed(2)}`;
  }

  function getDaysToExpiry(expiry: Date): number {
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  }

  function formatExpiryLabel(expiry: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    };
    const formatted = expiry.toLocaleDateString('en-US', options);
    const dte = getDaysToExpiry(expiry);
    return `${formatted} (${dte}d)`;
  }

  function formatStrikeLabel(strike: number, currentPriceVal: number): string {
    const moneyness = getMoneyness(strike, currentPriceVal);
    const label = `$${strike.toFixed(2)}`;

    if (moneyness === 'atm') {
      return `${label} (ATM)`;
    }
    if (moneyness === 'itm') {
      return `${label} (ITM)`;
    }
    return `${label} (OTM)`;
  }

  function aggregateContractsByStrikeExpiry(
    contractsList: OptionContract[],
    filtersState: HeatmapFilterState,
    currentPriceVal: number
  ): {
    strikes: number[];
    expirations: Date[];
    cellMap: Map<string, HeatmapCellData>;
  } {
    const strikes = new Set<number>();
    const expirations = new Set<string>();
    const cellMap = new Map<string, HeatmapCellData>();

    for (const contract of contractsList) {
      // Apply filters
      if (filtersState.optionType !== 'both' && contract.optionType !== filtersState.optionType) {
        continue;
      }

      const moneyness = getMoneyness(contract.strike, currentPriceVal);
      if (filtersState.moneynessFilter !== 'all' && moneyness !== filtersState.moneynessFilter) {
        continue;
      }

      strikes.add(contract.strike);
      const expiryKey = contract.expiry.toISOString();
      expirations.add(expiryKey);

      const cellKey = `${contract.strike}|${expiryKey}`;
      if (!cellMap.has(cellKey)) {
        cellMap.set(cellKey, {
          strike: contract.strike,
          expiry: contract.expiry,
          metricValue: 0,
          totalPremium: 0,
          dailyYield: 0,
          annualizedYield: 0,
          callContracts: [],
          putContracts: [],
          riskLevel: contract.riskLevel,
        });
      }

      const cell = cellMap.get(cellKey)!;
      if (contract.optionType === 'call') {
        cell.callContracts.push(contract);
      } else {
        cell.putContracts.push(contract);
      }

      // Accumulate metrics
      cell.totalPremium += contract.premium;
      cell.dailyYield += contract.dailyYield;
      cell.annualizedYield = contract.annualizedReturn;

      if (filtersState.metricMode === 'premium') {
        cell.metricValue = contract.premium;
      } else if (filtersState.metricMode === 'delta') {
        cell.metricValue = contract.delta;
      } else if (filtersState.metricMode === 'ari') {
        cell.metricValue = contract.annualizedReturn / 100;
      }
    }

    const sortedStrikes = Array.from(strikes).sort((a, b) => a - b);
    const sortedExpirations = Array.from(expirations)
      .map((key) => new Date(key))
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      strikes: sortedStrikes,
      expirations: sortedExpirations,
      cellMap,
    };
  }

  // Event Handlers

  const handleFilterChange = (
    key: keyof HeatmapFilterState,
    value: 'call' | 'put' | 'both' | MetricMode | MoneynessCategoryFilter
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      optionType: 'both',
      metricMode: 'premium',
      moneynessFilter: 'all',
    });
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleCellClick = (cellData: HeatmapCellData) => {
    const contractsToConsider =
      filters.optionType === 'call'
        ? cellData.callContracts
        : filters.optionType === 'put'
          ? cellData.putContracts
          : [...cellData.callContracts, ...cellData.putContracts];

    if (contractsToConsider.length > 0) {
      onSelectContract(contractsToConsider[0], cellData.strike, cellData.expiry);
    }
  };

  // Data Aggregation

  const { strikes, expirations, cellMap } = aggregateContractsByStrikeExpiry(
    contracts,
    filters,
    currentPrice
  );

  // If selectedExpiry is provided, show only that expiration
  // Otherwise, filter based on selectedDTE (with ± 2 days tolerance)
  let displayExpirations: Date[];

  if (selectedExpiry) {
    displayExpirations = expirations.filter((exp) => {
      const expTime = exp.getTime();
      const selectedTime = selectedExpiry.getTime();
      const diffMs = Math.abs(expTime - selectedTime);
      const diffDays = diffMs / (24 * 60 * 60 * 1000);
      return diffDays < 1; // Show only the selected expiry (within same day)
    });
    // If exact match not found, show the selected expiry anyway
    if (displayExpirations.length === 0) {
      displayExpirations = [selectedExpiry];
    }
  } else if (selectedDTE) {
    // Filter to focus on selectedDTE (show selectedDTE ± 2 days)
    const dteTolerance = 2;
    const filteredExpirations = expirations.filter((exp) => {
      const dte = getDaysToExpiry(exp);
      return Math.abs(dte - selectedDTE) <= dteTolerance;
    });
    displayExpirations = filteredExpirations.length > 0 ? filteredExpirations : expirations;
  } else {
    displayExpirations = expirations;
  }

  // Render Cell

  // Find max premium and yield for highlighting
  const allCells = Array.from(cellMap.values()).filter((cell) => cell.totalPremium > 0);
  const maxPremium = Math.max(...allCells.map((c) => c.totalPremium), 0);
  const maxYield = Math.max(...allCells.map((c) => c.annualizedYield), 0);

  const renderCell = (cellData: HeatmapCellData | null) => {
    if (!cellData) {
      return (
        <div className="p-2 text-center text-neutral-400 dark:text-neutral-500">
          —
        </div>
      );
    }

    const riskColor = getRiskColor(cellData.annualizedYield);
    const metricLabel = getMetricLabel(filters.metricMode);
    const metricValue = formatMetricValue(cellData.metricValue, filters.metricMode);

    // Highlight high premium or high yield cells
    const isHighPremium = cellData.totalPremium >= maxPremium * 0.85;
    const isHighYield = cellData.annualizedYield >= maxYield * 0.85;
    const badge = isHighPremium ? '💰' : isHighYield ? '⭐' : '';

    return (
      <button
        onClick={() => handleCellClick(cellData)}
        className={`w-full h-full p-3 rounded transition-all hover:shadow-md cursor-pointer border border-neutral-200 dark:border-neutral-700 relative ${riskColor}`}
      >
        {badge && (
          <div className="absolute top-1 right-1 text-lg">{badge}</div>
        )}
        <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          {metricLabel}: {metricValue}
        </div>
        <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
          Premium: ${cellData.totalPremium.toFixed(2)}
        </div>
        <div className="text-xs text-neutral-600 dark:text-neutral-400">
          Yield: {(cellData.annualizedYield).toFixed(1)}%
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Ticker Banner and Buttons */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <div>
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
            {ticker}
          </h3>
          <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
            ${currentPrice.toFixed(2)}
          </p>
        </div>
        <button
          onClick={openGuideModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Open Options Key & Guide"
        >
          <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Options Key & Guide
          </span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Call/Put Toggle */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Type
            </label>
            <select
              value={filters.optionType}
              onChange={(e) =>
                handleFilterChange('optionType', e.target.value as 'call' | 'put' | 'both')
              }
              className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="both">Both</option>
              <option value="call">Calls</option>
              <option value="put">Puts</option>
            </select>
          </div>

          {/* Mode Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Mode
            </label>
            <select
              value={filters.metricMode}
              onChange={(e) =>
                handleFilterChange('metricMode', e.target.value as MetricMode)
              }
              className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="premium">Premium</option>
              <option value="ari">Annualized Return</option>
              <option value="delta">Delta</option>
            </select>
          </div>

          {/* Moneyness Filter */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Moneyness
            </label>
            <select
              value={filters.moneynessFilter}
              onChange={(e) =>
                handleFilterChange('moneynessFilter', e.target.value as MoneynessCategoryFilter)
              }
              className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="itm">In-The-Money</option>
              <option value="atm">At-The-Money</option>
              <option value="otm">Out-Of-Money</option>
            </select>
          </div>

          {/* Placeholder for future filters */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Time Range
            </label>
            <select
              disabled
              className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 cursor-not-allowed"
            >
              <option>All</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex flex-col gap-2 justify-end">
            <button
              onClick={handleClearFilters}
              className="w-full px-3 py-2 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Grid Section - DTE as columns (horizontally scrollable) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Strike Heat Map</h3>

        {/* DTE Quick Select Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Quick Jump:
          </span>
          {[7, 14, 30, 45].map((dte) => (
            <button
              key={dte}
              onClick={() => setSelectedDTE(dte as 7 | 14 | 30 | 45)}
              className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${
                selectedDTE === dte
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {dte}DTE
            </button>
          ))}
        </div>

        {selectedExpiry ? (
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            📍 Focused on {formatExpiryLabel(selectedExpiry)} • Scroll to explore other dates
          </p>
        ) : (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {selectedDTE
              ? `Showing ${selectedDTE}DTE range (±2 days) • Scroll to see all expirations`
              : 'Scroll right to explore different expiration dates'}
          </p>
        )}

        {/* Scroll Controls and Grid Container */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleScroll('left')}
            className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex-shrink-0"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
          </button>

          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <style>{`
              div[style*="scrollbarWidth"] {
                -webkit-scrollbar { display: none; }
              }
              div[style*="scrollbarWidth"]::-webkit-scrollbar {
                display: none;
              }
            `}</style>
          <div className="inline-block min-w-full">
            {/* DTE Header Row */}
            <div
              className="grid gap-0 bg-neutral-100 dark:bg-neutral-900"
              style={{ gridTemplateColumns: `150px repeat(${Math.max(1, displayExpirations.length)}, 140px)` }}
            >
              {/* Top-left corner (empty) */}
              <div className="p-3 border-b border-r border-neutral-200 dark:border-neutral-800" />

              {/* DTE/Expiration Headers */}
              {displayExpirations.map((expiry) => {
                const isSelected = selectedExpiry && Math.abs(expiry.getTime() - selectedExpiry.getTime()) < 86400000;
                return (
                  <div
                    key={`header-${expiry.getTime()}`}
                    className={`p-3 text-center text-xs font-semibold border-b border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100'
                        : 'text-neutral-900 dark:text-white'
                    }`}
                  >
                    {formatExpiryLabel(expiry)}
                  </div>
                );
              })}
            </div>

            {/* Strike Rows */}
            {strikes.map((strike) => (
              <div
                key={`row-${strike}`}
                className="grid gap-0"
                style={{ gridTemplateColumns: `150px repeat(${Math.max(1, displayExpirations.length)}, 140px)` }}
              >
                {/* Strike Label */}
                <div className="p-3 text-xs font-semibold text-neutral-900 dark:text-white bg-neutral-50 dark:bg-neutral-950 border-b border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                  {formatStrikeLabel(strike, currentPrice)}
                </div>

                {/* Data Cells */}
                {displayExpirations.map((expiry) => {
                  const cellKey = `${strike}|${expiry.toISOString()}`;
                  const cellData = cellMap.get(cellKey) || null;
                  const isSelected = selectedExpiry && Math.abs(expiry.getTime() - selectedExpiry.getTime()) < 86400000;
                  return (
                    <div
                      key={cellKey}
                      className={`border-b border-r border-neutral-200 dark:border-neutral-800 min-h-20 transition-colors ${
                        isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      {renderCell(cellData)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          </div>

          <button
            onClick={() => handleScroll('right')}
            className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex-shrink-0"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4 border border-neutral-200 dark:border-neutral-800 space-y-4">
        <div>
          <div className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
            Risk Color Legend
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-950/30 rounded border border-emerald-200 dark:border-emerald-800" />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                Low Risk: &lt;30% yield
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-yellow-100 dark:bg-yellow-950/30 rounded border border-yellow-200 dark:border-yellow-800" />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                Medium Risk: 30-60%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-pink-100 dark:bg-pink-950/30 rounded border border-pink-200 dark:border-pink-800" />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                High Risk: &gt;60%
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
            Cell Badges
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-lg">💰</span>
              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                High Premium (≥85% of max)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg">⭐</span>
              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                High Yield (≥85% of max)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
