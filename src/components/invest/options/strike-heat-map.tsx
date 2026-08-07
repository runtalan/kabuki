'use client';

import { OptionChain } from '@/lib/yahoo-finance-client';

interface StrikeHeatMapProps {
  data: OptionChain;
  onStrikeClick: (strike: number, isCall: boolean) => void;
}

function getHeatColor(volume: number, maxVolume: number): string {
  if (!volume) return 'bg-gray-100 dark:bg-gray-800';

  const ratio = volume / maxVolume;
  if (ratio > 0.75) return 'bg-green-200 dark:bg-green-900';
  if (ratio > 0.5) return 'bg-yellow-200 dark:bg-yellow-900';
  if (ratio > 0.25) return 'bg-orange-200 dark:bg-orange-900';
  return 'bg-gray-200 dark:bg-gray-700';
}

export function StrikeHeatMap({ data, onStrikeClick }: StrikeHeatMapProps) {
  const { calls, puts, currentPrice, daysToExpiry } = data;

  if (!calls.length && !puts.length) {
    return (
      <div className="text-center text-gray-500 py-8">
        No options data available for this strike range.
      </div>
    );
  }

  const allStrikes = calls.concat(puts);
  const maxVolume = Math.max(...allStrikes.map((s) => s.volume), 1);

  const strikes = Array.from(
    new Set(allStrikes.map((s) => s.strike))
  ).sort((a, b) => a - b);

  return (
    <div className="w-full">
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Current Price: ${currentPrice.toFixed(2)} | DTE: {daysToExpiry}d
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Calls Row */}
          <div className="mb-1">
            <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Calls
            </div>
            <div className="flex gap-1">
              {strikes.map((strike) => {
                const call = calls.find((c) => c.strike === strike);
                return (
                  <button
                    key={`call-${strike}`}
                    onClick={() => onStrikeClick(strike, true)}
                    className={`
                      flex-shrink-0 w-12 h-12 rounded
                      flex items-center justify-center text-xs font-bold
                      cursor-pointer transition
                      ${getHeatColor(call?.volume || 0, maxVolume)}
                      border border-gray-300 dark:border-gray-600
                      hover:scale-110 hover:shadow-md
                    `}
                    title={
                      call
                        ? `$${strike} | Vol: ${call.volume} | OI: ${call.openInterest}`
                        : `$${strike} | No data`
                    }
                  >
                    {call ? (
                      <span className="text-green-700 dark:text-green-300">
                        C
                      </span>
                    ) : (
                      '—'
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Puts Row */}
          <div>
            <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Puts
            </div>
            <div className="flex gap-1">
              {strikes.map((strike) => {
                const put = puts.find((p) => p.strike === strike);
                return (
                  <button
                    key={`put-${strike}`}
                    onClick={() => onStrikeClick(strike, false)}
                    className={`
                      flex-shrink-0 w-12 h-12 rounded
                      flex items-center justify-center text-xs font-bold
                      cursor-pointer transition
                      ${getHeatColor(put?.volume || 0, maxVolume)}
                      border border-gray-300 dark:border-gray-600
                      hover:scale-110 hover:shadow-md
                    `}
                    title={
                      put
                        ? `$${strike} | Vol: ${put.volume} | OI: ${put.openInterest}`
                        : `$${strike} | No data`
                    }
                  >
                    {put ? (
                      <span className="text-red-700 dark:text-red-300">P</span>
                    ) : (
                      '—'
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Strike Price Labels */}
          <div className="mt-2 flex gap-1">
            {strikes.map((strike) => (
              <div
                key={`label-${strike}`}
                className="flex-shrink-0 w-12 text-center text-xs text-gray-600 dark:text-gray-400"
              >
                ${strike}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 text-xs text-gray-600 dark:text-gray-400 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-200 dark:bg-green-900 rounded border border-gray-300"></div>
          <span>High Volume</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-200 dark:bg-orange-900 rounded border border-gray-300"></div>
          <span>Low Volume</span>
        </div>
      </div>
    </div>
  );
}
