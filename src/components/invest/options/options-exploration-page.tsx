'use client';

import { useState, useRef, useEffect } from 'react';
import { StrikeHeatMap } from './strike-heat-map';
import {
  WatchlistSkeleton,
  HeatMapSkeleton,
  OrderFormSkeleton,
} from './skeleton-loaders';
import { cache } from '@/lib/cache';
import type { OptionChain } from '@/lib/yahoo-finance-client';

interface OptionsExplorationPageProps {
  initialTicker?: string;
}

interface WatchlistItem {
  ticker: string;
  name: string;
  currentPrice: number;
  dayChange: number;
  dayChangePercent: number;
  volume: number;
}

export function OptionsExplorationPage({
  initialTicker,
}: OptionsExplorationPageProps) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(
    initialTicker || null
  );
  const [selectedExpiry, setSelectedExpiry] = useState<string | null>(null);
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<'call' | 'put'>('call');

  const [watchlistData, setWatchlistData] = useState<WatchlistItem[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);

  const [expirations, setExpirations] = useState<string[]>([]);
  const [expiryLoading, setExpiryLoading] = useState(false);

  const [chainData, setChainData] = useState<OptionChain | null>(null);
  const [chainLoading, setChainLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const orderFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        setWatchlistLoading(true);
        setWatchlistError(null);
        const data = await cache(
          'watchlist',
          30,
          async () => {
            const res = await fetch('/api/watchlist');
            if (!res.ok) throw new Error('Failed to fetch watchlist');
            const json = await res.json();
            return json.watchlist;
          }
        );
        setWatchlistData(data);
        if (!selectedTicker && data.length > 0) {
          setSelectedTicker(data[0].ticker);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load watchlist';
        setWatchlistError(msg);
      } finally {
        setWatchlistLoading(false);
      }
    };
    loadWatchlist();
  }, []);

  useEffect(() => {
    if (!selectedTicker) return;

    const loadExpirations = async () => {
      try {
        setExpiryLoading(true);
        const data = await cache(
          `expirations-${selectedTicker}`,
          60,
          async () => {
            const res = await fetch(
              `/api/options/expirations?ticker=${selectedTicker}`
            );
            if (!res.ok) throw new Error('Failed to fetch expirations');
            const json = await res.json();
            return json.expirations;
          }
        );
        setExpirations(data);
        if (data.length > 0 && !selectedExpiry) {
          setSelectedExpiry(data[0]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load expirations';
        setError(msg);
        setTimeout(() => setError(null), 5000);
        setExpirations([]);
      } finally {
        setExpiryLoading(false);
      }
    };
    loadExpirations();
  }, [selectedTicker]);

  useEffect(() => {
    if (!selectedTicker || !selectedExpiry) return;

    const loadChain = async () => {
      try {
        setChainLoading(true);
        const data = await cache(
          `chain-${selectedTicker}-${selectedExpiry}`,
          60,
          async () => {
            const res = await fetch(
              `/api/options/chain?ticker=${selectedTicker}&expiry=${selectedExpiry}`
            );
            if (!res.ok) throw new Error('Failed to fetch option chain');
            return res.json();
          }
        );
        setChainData(data);
        setSelectedStrike(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load option chain';
        setError(msg);
        setTimeout(() => setError(null), 5000);
        setChainData(null);
      } finally {
        setChainLoading(false);
      }
    };
    loadChain();
  }, [selectedTicker, selectedExpiry]);

  useEffect(() => {
    if (selectedTicker && orderFormRef.current) {
      orderFormRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [selectedTicker]);

  const handleWatchlistSelect = (ticker: string) => {
    setSelectedTicker(ticker);
  };

  const handleStrikeClick = (strike: number, isCall: boolean) => {
    setSelectedStrike(strike);
    setSelectedType(isCall ? 'call' : 'put');
  };

  const currentPrice = chainData?.currentPrice || 0;

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {/* LEFT COLUMN: Watchlist */}
        <div className="md:col-span-1 border-r border-gray-200 dark:border-gray-800 pr-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Watchlist
            </h2>
          </div>
          {watchlistLoading ? (
            <WatchlistSkeleton />
          ) : watchlistError ? (
            <div className="text-sm text-red-600 dark:text-red-400 p-4 bg-red-50 dark:bg-red-900/20 rounded">
              {watchlistError}
            </div>
          ) : watchlistData.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 p-4">
              No tickers in watchlist
            </div>
          ) : (
            <div className="space-y-2">
              {watchlistData.map((item) => (
                <button
                  key={item.ticker}
                  onClick={() => handleWatchlistSelect(item.ticker)}
                  className={`
                    w-full text-left p-3 rounded transition
                    ${
                      selectedTicker === item.ticker
                        ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500'
                        : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    }
                    hover:bg-gray-100 dark:hover:bg-gray-700
                  `}
                >
                  <div className="font-bold text-gray-900 dark:text-gray-100">
                    {item.ticker}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    ${item.currentPrice.toFixed(2)}
                  </div>
                  <div
                    className={`text-xs font-semibold ${
                      item.dayChangePercent >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {item.dayChangePercent >= 0 ? '+' : ''}
                    {item.dayChangePercent.toFixed(2)}%
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CENTER COLUMN: Strike Heat Map */}
        <div className="md:col-span-1 border-r border-gray-200 dark:border-gray-800 pr-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              {selectedTicker ? `${selectedTicker} Options` : 'Select a ticker'}
            </h2>
            {selectedTicker && (
              <select
                value={selectedExpiry || ''}
                onChange={(e) => setSelectedExpiry(e.target.value)}
                className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm mb-4"
              >
                <option value="">Loading expirations...</option>
                {expirations.map((expiry) => (
                  <option key={expiry} value={expiry}>
                    {new Date(expiry + 'T00:00:00').toLocaleDateString()} (
                    {expiry})
                  </option>
                ))}
              </select>
            )}
          </div>

          {chainLoading ? (
            <HeatMapSkeleton />
          ) : chainData ? (
            <StrikeHeatMap data={chainData} onStrikeClick={handleStrikeClick} />
          ) : (
            <div className="text-center text-gray-500 py-8 text-sm">
              {selectedTicker && selectedExpiry
                ? 'No chain data available'
                : 'Select a ticker and expiry'}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Order Builder */}
        <div className="md:col-span-1" ref={orderFormRef}>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Order Builder
            </h2>
          </div>

          {selectedTicker && selectedExpiry && chainData ? (
            <div className="space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              {/* Ticker & Expiry Summary */}
              <div className="text-sm">
                <div className="font-bold text-gray-900 dark:text-gray-100">
                  {selectedTicker} @ ${currentPrice.toFixed(2)}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Exp:{' '}
                  {new Date(selectedExpiry + 'T00:00:00').toLocaleDateString()}
                </div>
              </div>

              {/* Call/Put Toggle */}
              <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">
                  Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedType('call')}
                    className={`flex-1 py-2 rounded font-bold transition ${
                      selectedType === 'call'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white'
                    }`}
                  >
                    Call
                  </button>
                  <button
                    onClick={() => setSelectedType('put')}
                    className={`flex-1 py-2 rounded font-bold transition ${
                      selectedType === 'put'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white'
                    }`}
                  >
                    Put
                  </button>
                </div>
              </div>

              {/* Strike Input */}
              <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">
                  Strike
                </label>
                <input
                  type="number"
                  value={selectedStrike || ''}
                  onChange={(e) =>
                    setSelectedStrike(
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  placeholder="Click heatmap or enter"
                  className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  defaultValue="1"
                  placeholder="1"
                  className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>

              {/* Order Type */}
              <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">
                  Order Type
                </label>
                <select className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm">
                  <option>Market</option>
                  <option>Limit</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <button className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded transition text-sm">
                  Buy
                </button>
                <button className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded transition text-sm">
                  Sell
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8 text-sm">
              Select a ticker and expiry to place an order
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
