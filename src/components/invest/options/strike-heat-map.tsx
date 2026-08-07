'use client';

import { useState, useRef } from 'react';
import { OptionChain } from '@/lib/yahoo-finance-client';

interface StrikeHeatMapProps {
  data: OptionChain;
  onStrikeClick: (strike: number, isCall: boolean) => void;
}

const STRIKES_PER_VIEW = 14;

export function StrikeHeatMap({ data, onStrikeClick }: StrikeHeatMapProps) {
  const [selectedType, setSelectedType] = useState<'call' | 'put'>('call');
  const tableRef = useRef<HTMLDivElement>(null);
  const { calls, puts, currentPrice, daysToExpiry } = data;

  const options = selectedType === 'call' ? calls : puts;

  if (!calls.length && !puts.length) {
    return (
      <div className="text-center text-gray-500 py-8">
        No options data available for this strike range.
      </div>
    );
  }

  const allStrikes = calls.concat(puts);
  const allStrikesArray = Array.from(
    new Set(allStrikes.map((s) => s.strike))
  ).sort((a, b) => a - b);

  // Find ATM index
  const atmIndex = allStrikesArray.findIndex((s) => Math.abs(s - currentPrice) < 1);

  // Initialize to show ATM centered, clamped to valid range
  const getInitialIndex = () => {
    if (atmIndex < 0) return 0;
    const centered = atmIndex - Math.floor(STRIKES_PER_VIEW / 2);
    return Math.max(0, Math.min(centered, allStrikesArray.length - STRIKES_PER_VIEW));
  };

  const [startIndex, setStartIndex] = useState(getInitialIndex());

  const strikes = allStrikesArray.slice(startIndex, startIndex + STRIKES_PER_VIEW);

  const canScrollLeft = startIndex > 0;
  const canScrollRight = startIndex < allStrikesArray.length - STRIKES_PER_VIEW;

  const getStrikeStatus = (strike: number): 'atm' | 'itm' | 'otm' => {
    const diff = Math.abs(strike - currentPrice);
    if (diff < 1) return 'atm';
    if (selectedType === 'call') {
      return strike > currentPrice ? 'otm' : 'itm';
    } else {
      return strike < currentPrice ? 'otm' : 'itm';
    }
  };

  const getHeaderColor = (strike: number) => {
    const status = getStrikeStatus(strike);
    if (status === 'atm')
      return 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border-blue-300';
    if (status === 'itm')
      return 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 border-green-300';
    return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300';
  };

  const getCellColor = (profitPercent: number) => {
    if (profitPercent >= 2) return 'bg-green-100 dark:bg-green-900/40';
    if (profitPercent >= 1) return 'bg-green-50 dark:bg-green-900/20';
    if (profitPercent >= 0.5) return 'bg-yellow-50 dark:bg-yellow-900/20';
    if (profitPercent > 0) return 'bg-orange-50 dark:bg-orange-900/20';
    return 'bg-gray-50 dark:bg-gray-800/50';
  };

  const calculateMetrics = (option: (typeof options)[0]) => {
    const midPrice = (option.bid + option.ask) / 2;
    const profitPercent = (midPrice / currentPrice) * 100;
    const dailyDecay = midPrice / Math.max(daysToExpiry, 1);
    return { midPrice, profitPercent, dailyDecay };
  };

  const handleJumpToATM = () => {
    const newStart = Math.max(0, Math.min(atmIndex - Math.floor(STRIKES_PER_VIEW / 2), allStrikesArray.length - STRIKES_PER_VIEW));
    setStartIndex(newStart);
  };

  const handleScrollLeft = () => {
    setStartIndex(Math.max(0, startIndex - Math.floor(STRIKES_PER_VIEW / 2)));
  };

  const handleScrollRight = () => {
    const maxStart = Math.max(0, allStrikesArray.length - STRIKES_PER_VIEW);
    setStartIndex(Math.min(maxStart, startIndex + Math.floor(STRIKES_PER_VIEW / 2)));
  };

  return (
    <div className="w-full space-y-4">
      {/* Controls */}
      <div className="flex gap-2 items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedType('call')}
            className={`px-4 py-2 rounded font-semibold transition text-sm ${
              selectedType === 'call'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            }`}
          >
            Call
          </button>
          <button
            onClick={() => setSelectedType('put')}
            className={`px-4 py-2 rounded font-semibold transition text-sm ${
              selectedType === 'put'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            }`}
          >
            Put
          </button>
        </div>
        <div className="flex gap-4 items-center text-xs text-gray-600 dark:text-gray-400">
          <span className="font-semibold">Spot: ${currentPrice.toFixed(2)}</span>
          <span className="font-semibold">DTE: {daysToExpiry}d</span>
          <button
            onClick={handleJumpToATM}
            className="px-3 py-1 rounded text-xs bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 hover:bg-blue-300 dark:hover:bg-blue-700 font-semibold transition"
          >
            Center ATM
          </button>
        </div>
      </div>

      {/* Strike Navigation */}
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={handleScrollLeft}
          disabled={!canScrollLeft}
          className={`px-3 py-1.5 rounded font-bold transition text-sm ${
            canScrollLeft
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          ← Lower Strikes
        </button>
        <div className="flex-1 text-xs text-gray-600 dark:text-gray-400 text-center">
          Showing ${strikes[0]?.toFixed(0) || '—'} to ${strikes[strikes.length - 1]?.toFixed(0) || '—'}
          <span className="ml-2 font-semibold">({startIndex + 1}–{Math.min(startIndex + STRIKES_PER_VIEW, allStrikesArray.length)} of {allStrikesArray.length})</span>
        </div>
        <button
          onClick={handleScrollRight}
          disabled={!canScrollRight}
          className={`px-3 py-1.5 rounded font-bold transition text-sm ${
            canScrollRight
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          Higher Strikes →
        </button>
      </div>

      {/* Heatmap Table */}
      <div ref={tableRef} className="border border-gray-300 dark:border-gray-600 rounded overflow-x-auto bg-white dark:bg-gray-900">
        <table className="border-collapse text-xs w-full">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
              <th className="px-3 py-3 text-left font-bold text-gray-900 dark:text-gray-100 w-20 sticky left-0 bg-gray-100 dark:bg-gray-800 z-10 border-r border-gray-300 dark:border-gray-600">
                Strike Price
              </th>
              {strikes.map((strike) => {
                const status = getStrikeStatus(strike);
                return (
                  <th
                    key={`header-${strike}`}
                    data-strike={strike}
                    className={`px-3 py-3 text-center font-bold border-r border-gray-200 dark:border-gray-700 min-w-[110px] ${getHeaderColor(strike)}`}
                  >
                    <div className="font-bold">${strike.toFixed(0)}</div>
                    <div className="text-xs font-normal opacity-70">
                      ({status.toUpperCase()})
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <td className="px-3 py-3 font-bold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800/50 sticky left-0 z-10 border-r border-gray-300 dark:border-gray-600 text-sm">
                <div>Today</div>
                <div className="text-xs font-normal text-gray-600 dark:text-gray-400">
                  {daysToExpiry}d
                </div>
              </td>
              {strikes.map((strike) => {
                const option = options.find((o) => o.strike === strike);
                const metrics = option ? calculateMetrics(option) : null;

                return (
                  <td
                    key={`cell-${strike}`}
                    className={`px-3 py-2 text-center border-r border-gray-200 dark:border-gray-700 cursor-pointer transition hover:shadow-md ${
                      metrics ? getCellColor(metrics.profitPercent) : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                    onClick={() => option && onStrikeClick(strike, selectedType === 'call')}
                    title={
                      option
                        ? `${selectedType === 'call' ? 'Call' : 'Put'} @ $${strike}\nMid: $${metrics?.midPrice.toFixed(2)}\nVol: ${option.volume} | OI: ${option.openInterest}\nBid: $${option.bid?.toFixed(2) || 'N/A'} | Ask: $${option.ask?.toFixed(2) || 'N/A'}`
                        : `No data`
                    }
                  >
                    {option && metrics ? (
                      <div className="space-y-1">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {metrics.profitPercent.toFixed(2)}%
                        </div>
                        <div className="text-gray-700 dark:text-gray-300 font-semibold">
                          ${metrics.midPrice.toFixed(2)}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          ${metrics.dailyDecay.toFixed(2)}/day
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400 dark:text-gray-600 py-2">—</div>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-600 dark:text-gray-400">
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-100 dark:bg-green-900/40 rounded border border-green-300"></div>
            <span>High Profit (≥2%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200"></div>
            <span>Medium Profit (0.5-2%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200"></div>
            <span>Low Profit (0-0.5%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
