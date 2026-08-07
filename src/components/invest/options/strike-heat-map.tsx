'use client';

import { useState, useRef, useEffect } from 'react';
import { OptionChain } from '@/lib/yahoo-finance-client';

interface StrikeHeatMapProps {
  data: OptionChain;
  onStrikeClick: (strike: number, isCall: boolean) => void;
}

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
  const strikes = Array.from(
    new Set(allStrikes.map((s) => s.strike))
  ).sort((a, b) => a - b);

  const maxVolume = Math.max(
    ...options.map((s) => s.volume),
    1
  );

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
      return 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100';
    if (status === 'itm')
      return 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100';
    return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
  };

  const getHeatColor = (volume: number) => {
    if (!volume) return 'bg-gray-50 dark:bg-gray-900';
    const ratio = volume / maxVolume;
    if (ratio > 0.75) return 'bg-green-100 dark:bg-green-900';
    if (ratio > 0.5) return 'bg-yellow-100 dark:bg-yellow-900';
    if (ratio > 0.25) return 'bg-orange-100 dark:bg-orange-900';
    return 'bg-gray-100 dark:bg-gray-800';
  };

  const handleJumpToATM = () => {
    if (tableRef.current) {
      const atmStrikes = strikes.filter((s) => Math.abs(s - currentPrice) < 1);
      if (atmStrikes.length > 0) {
        const atmStrike = atmStrikes[0];
        const atmElement = tableRef.current.querySelector(`[data-strike="${atmStrike}"]`);
        if (atmElement) {
          atmElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Controls */}
      <div className="flex gap-2 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedType('call')}
            className={`px-5 py-2 rounded-lg font-bold transition text-sm ${
              selectedType === 'call'
                ? 'bg-green-500 text-white'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-500'
            }`}
          >
            Call
          </button>
          <button
            onClick={() => setSelectedType('put')}
            className={`px-5 py-2 rounded-lg font-bold transition text-sm ${
              selectedType === 'put'
                ? 'bg-red-500 text-white'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-500'
            }`}
          >
            Put
          </button>
        </div>
        <div className="flex gap-3 items-center text-xs text-gray-600 dark:text-gray-400">
          <span>Spot: ${currentPrice.toFixed(2)} | {daysToExpiry}d</span>
          <button
            onClick={handleJumpToATM}
            className="px-3 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 font-semibold transition"
          >
            Center ATM
          </button>
        </div>
      </div>

      {/* Heatmap Table */}
      <div ref={tableRef} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
        <table className="border-collapse text-xs bg-white dark:bg-gray-900">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th className="px-2 py-1.5 text-left font-semibold text-gray-700 dark:text-gray-300 w-16 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10">
                Exp
              </th>
              {strikes.map((strike) => (
                <th
                  key={`header-${strike}`}
                  data-strike={strike}
                  className={`px-1 py-1.5 text-center font-bold border-l border-gray-200 dark:border-gray-700 min-w-[60px] ${getHeaderColor(
                    strike
                  )}`}
                >
                  <div className="font-bold text-xs">${strike.toFixed(0)}</div>
                  <div className="text-xs font-normal opacity-60">
                    {getStrikeStatus(strike).toUpperCase()[0]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
              <td className="px-2 py-1.5 font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 sticky left-0 z-10 text-xs">
                <div>Today</div>
              </td>
              {strikes.map((strike) => {
                const option = options.find((o) => o.strike === strike);
                return (
                  <td
                    key={`cell-${strike}`}
                    className={`px-1 py-1.5 text-center border-l border-gray-200 dark:border-gray-700 cursor-pointer transition hover:shadow-lg ${getHeatColor(
                      option?.volume || 0
                    )}`}
                    onClick={() => onStrikeClick(strike, selectedType === 'call')}
                    title={
                      option
                        ? `${selectedType === 'call' ? 'Call' : 'Put'} @ $${strike}\nPrice: $${((option.bid + option.ask) / 2).toFixed(2)}\nVol: ${option.volume}\nOI: ${option.openInterest}\nBid: $${option.bid?.toFixed(2) || 'N/A'} | Ask: $${option.ask?.toFixed(2) || 'N/A'}`
                        : `No data`
                    }
                  >
                    {option ? (
                      <div className="space-y-0.5">
                        <div className="font-bold text-gray-900 dark:text-white text-xs">
                          ${((option.bid + option.ask) / 2).toFixed(2)}
                        </div>
                        {option.volume > 0 && (
                          <div className="text-xs text-blue-700 dark:text-blue-300 font-semibold">
                            v:{option.volume}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400 dark:text-gray-600 text-xs">—</div>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900 rounded border border-gray-300"></div>
            <span className="font-semibold">ATM</span>
          </div>
          <div className="flex gap-2">
            <div className="w-4 h-4 bg-green-100 dark:bg-green-900 rounded border border-gray-300"></div>
            <span className="font-semibold">ITM</span>
          </div>
          <div className="flex gap-2">
            <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300"></div>
            <span className="font-semibold">OTM</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <div className="w-4 h-4 bg-green-100 dark:bg-green-900 rounded border border-gray-300"></div>
            <span>High Volume</span>
          </div>
          <div className="flex gap-2">
            <div className="w-4 h-4 bg-orange-100 dark:bg-orange-900 rounded border border-gray-300"></div>
            <span>Medium Volume</span>
          </div>
        </div>
      </div>
    </div>
  );
}
