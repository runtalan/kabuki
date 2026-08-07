'use client';

import { useState, useRef, useEffect } from 'react';
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

interface ExpiryChainData {
  expiry: string;
  daysToExpiry: number;
  chain: OptionChain;
}

export function OptionsExplorationPage({
  initialTicker,
}: OptionsExplorationPageProps) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(
    initialTicker || null
  );
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<'call' | 'put'>('call');

  const [watchlistData, setWatchlistData] = useState<WatchlistItem[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);

  const [expirations, setExpirations] = useState<string[]>([]);
  const [chainDataByExpiry, setChainDataByExpiry] = useState<Map<string, ExpiryChainData>>(new Map());
  const [allChainsLoading, setAllChainsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [strikeScrollIndex, setStrikeScrollIndex] = useState(0);

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

    // Clear old chain data when ticker changes so atmStrike becomes null
    // during loading. This prevents the scroll effect from running on stale data.
    setChainDataByExpiry(new Map());

    const loadExpirations = async () => {
      try {
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
        console.log('Loaded expirations:', data);
        setExpirations(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load expirations';
        console.error('Expiration load error:', msg);
        setError(msg);
        setTimeout(() => setError(null), 5000);
        setExpirations([]);
      }
    };
    loadExpirations();
  }, [selectedTicker]);

  useEffect(() => {
    if (!selectedTicker || expirations.length === 0) return;

    const loadAllChains = async () => {
      try {
        setAllChainsLoading(true);
        const chains = new Map<string, ExpiryChainData>();
        let loaded = 0;
        const targetCount = 12;

        console.log('Attempting to load chains from', expirations.length, 'available expirations');

        for (const expiry of expirations) {
          if (loaded >= targetCount) break;
          try {
            const data = await cache(
              `chain-${selectedTicker}-${expiry}`,
              60,
              async () => {
                const res = await fetch(
                  `/api/options/chain?ticker=${selectedTicker}&expiry=${expiry}`
                );
                if (!res.ok) throw new Error('Failed to fetch option chain');
                return res.json();
              }
            );

            const expiryDate = new Date(expiry + 'T00:00:00');
            const daysToExpiry = Math.ceil(
              (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );

            chains.set(expiry, {
              expiry,
              daysToExpiry,
              chain: data,
            });
            loaded++;
            console.log('Loaded chain for', expiry, '- DTE:', daysToExpiry, `(${loaded}/${targetCount})`);
          } catch (err) {
            console.error('Failed to load chain for', expiry, err);
            // Skip expirations that don't have data, try next one
          }
        }

        console.log('Final chains loaded:', chains.size);
        setChainDataByExpiry(chains);
        setSelectedStrike(null);
        if (chains.size === 0) {
          setError('No option chains available');
          setTimeout(() => setError(null), 5000);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load chains';
        console.error('Chain load error:', msg);
        setError(msg);
        setTimeout(() => setError(null), 5000);
      } finally {
        setAllChainsLoading(false);
      }
    };

    loadAllChains();
  }, [selectedTicker, expirations]);

  const handleWatchlistSelect = (ticker: string) => {
    setSelectedTicker(ticker);
  };

  const handleStrikeClick = (strike: number, isCall: boolean) => {
    setSelectedStrike(strike);
    setSelectedType(isCall ? 'call' : 'put');
  };

  // Get all strikes from all chains
  const allChains = Array.from(chainDataByExpiry.values());
  const currentPrice = allChains[0]?.chain.currentPrice || 0;

  const allStrikes = allChains.length > 0
    ? Array.from(
        new Set(
          allChains.flatMap((item) => {
            const key = (selectedType + 's') as 'calls' | 'puts';
            const options = item.chain?.[key];
            if (!Array.isArray(options)) return [];
            return options.map((opt) => opt.strike);
          })
        )
      ).sort((a, b) => a - b)
    : [];

  // Different expirations quote strikes at different increments (e.g. $2.50
  // near-term vs $5 for LEAPS), so the strike closest to currentPrice often
  // only has data in one or two of the loaded chains. Prefer a strike that
  // has data in every loaded chain so the ATM column isn't mostly "—".
  const chainCoverageByStrike = new Map<number, number>();
  allChains.forEach((item) => {
    const key = (selectedType + 's') as 'calls' | 'puts';
    const options = item.chain?.[key];
    if (Array.isArray(options)) {
      const strikesInChain = new Set(options.map((opt) => opt.strike));
      strikesInChain.forEach((strike) => {
        chainCoverageByStrike.set(strike, (chainCoverageByStrike.get(strike) || 0) + 1);
      });
    }
  });
  // Find ATM from all strikes available
  const atmCandidates = allStrikes;

  // Find the single closest strike (ATM)
  const atmStrike = atmCandidates.length > 0
    ? atmCandidates.reduce((closest, strike) =>
        Math.abs(strike - currentPrice) < Math.abs(closest - currentPrice) ? strike : closest
      )
    : null;

  const getStrikeStatus = (strike: number): 'atm' | 'itm' | 'otm' => {
    if (strike === atmStrike) return 'atm';
    if (selectedType === 'call') {
      return strike > currentPrice ? 'otm' : 'itm';
    } else {
      return strike < currentPrice ? 'otm' : 'itm';
    }
  };

  // Show all strikes across all expirations, even if some don't have data in
  // certain chains (shown as "—"). This lets users see the full strike range.
  const filteredStrikes = allStrikes;
  const atmIndexInFiltered = atmStrike ? filteredStrikes.indexOf(atmStrike) : -1;

  // Self-healing window: if the stored strikeScrollIndex (set by an effect,
  // possibly stale from a prior ticker/type with a differently-sized strike
  // list) no longer contains the ATM strike, recenter on it directly at
  // render time instead of relying on the effect to catch up first.
  const maxScrollIndex = Math.max(0, filteredStrikes.length - 12);
  const atmInWindow =
    atmIndexInFiltered >= 0 &&
    atmIndexInFiltered >= strikeScrollIndex &&
    atmIndexInFiltered < strikeScrollIndex + 12;
  const displayScrollIndex = atmInWindow
    ? Math.min(strikeScrollIndex, maxScrollIndex)
    : atmIndexInFiltered >= 0
      ? Math.max(0, Math.min(atmIndexInFiltered - 6, maxScrollIndex))
      : Math.min(strikeScrollIndex, maxScrollIndex);

  // Reset strike scroll index when call/put changes or chains load
  useEffect(() => {
    if (atmIndexInFiltered >= 0) {
      const centered = Math.max(0, Math.min(atmIndexInFiltered - 6, filteredStrikes.length - 12));
      setStrikeScrollIndex(centered);
    }
  }, [selectedType, atmIndexInFiltered, filteredStrikes.length]);

  // Scroll container to center the ATM column horizontally on load or when
  // ticker/chains change. Depends on displayScrollIndex too, since the ATM
  // `<th>` only exists in the DOM once the self-healed window includes it.
  useEffect(() => {
    if (atmStrike === null) return;
    requestAnimationFrame(() => {
      const container = tableContainerRef.current;
      if (!container) return;
      const el = container.querySelector<HTMLElement>(`[data-strike="${atmStrike}"]`);
      if (!el) return;
      const target = el.offsetLeft + el.offsetWidth / 2 - container.clientWidth / 2;
      container.scrollLeft = Math.max(0, target);
    });
  }, [atmStrike, displayScrollIndex]);

  const handleJumpToATM = () => {
    if (atmIndexInFiltered < 0 || atmStrike === null) return;
    const centered = Math.max(0, Math.min(atmIndexInFiltered - 6, filteredStrikes.length - 12));
    setStrikeScrollIndex(centered);
    // The 12-strike window above only gets the ATM column onscreen; it
    // doesn't account for how many columns actually fit in the container
    // at the current viewport width. Scroll the container so the ATM `<th>`
    // (tagged with data-strike) lands at the true horizontal center, once
    // the window update above has committed to the DOM.
    requestAnimationFrame(() => {
      const container = tableContainerRef.current;
      if (!container) return;
      const el = container.querySelector<HTMLElement>(`[data-strike="${atmStrike}"]`);
      if (!el) return;
      const target = el.offsetLeft + el.offsetWidth / 2 - container.clientWidth / 2;
      container.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    });
  };

  const handleJumpToITM = () => {
    if (atmIndexInFiltered < 0) return;
    let targetStrike: number;
    if (selectedType === 'call') {
      const itmStrikes = filteredStrikes.slice(0, atmIndexInFiltered).reverse();
      targetStrike = itmStrikes[2] ?? filteredStrikes[0];
    } else {
      const itmStrikes = filteredStrikes.slice(atmIndexInFiltered + 1);
      targetStrike = itmStrikes[2] ?? filteredStrikes[filteredStrikes.length - 1];
    }
    const targetIndex = filteredStrikes.indexOf(targetStrike);
    const centered = Math.max(0, Math.min(targetIndex - 6, filteredStrikes.length - 12));
    setStrikeScrollIndex(centered);
  };

  const handleJumpToOTM = () => {
    if (atmIndexInFiltered < 0) return;
    let targetStrike: number;
    if (selectedType === 'call') {
      const otmStrikes = filteredStrikes.slice(atmIndexInFiltered + 1);
      targetStrike = otmStrikes[2] ?? filteredStrikes[filteredStrikes.length - 1];
    } else {
      const otmStrikes = filteredStrikes.slice(0, atmIndexInFiltered).reverse();
      targetStrike = otmStrikes[2] ?? filteredStrikes[0];
    }
    const targetIndex = filteredStrikes.indexOf(targetStrike);
    const centered = Math.max(0, Math.min(targetIndex - 6, filteredStrikes.length - 12));
    setStrikeScrollIndex(centered);
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

  const calculateMetrics = (option: any, daysToExpiry: number) => {
    const midPrice = (option.bid + option.ask) / 2;
    const profitPercent = (midPrice / currentPrice) * 100;
    const dailyDecay = midPrice / Math.max(daysToExpiry, 1);
    return { midPrice, profitPercent, dailyDecay };
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 w-full" style={{ height: 'calc(100vh - 60px)' }}>
        {/* LEFT COLUMN: Watchlist */}
        <div className="md:col-span-1 border-r border-gray-200 dark:border-gray-800 pr-4 flex flex-col" style={{ height: 'calc(100vh - 60px)' }}>
          <div className="mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Watchlist
            </h2>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {watchlistData.length} tickers
            </div>
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
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-2">
                {watchlistData.map((item) => (
                  <button
                    key={item.ticker}
                    onClick={() => handleWatchlistSelect(item.ticker)}
                    className={`
                      text-left p-2 rounded transition text-xs
                      ${
                        selectedTicker === item.ticker
                          ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500'
                          : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                      }
                      hover:bg-gray-100 dark:hover:bg-gray-700
                    `}
                  >
                    <div className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight">
                      {item.ticker}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs leading-tight">
                      ${item.currentPrice.toFixed(0)}
                    </div>
                    <div
                      className={`font-semibold leading-tight ${
                        item.dayChangePercent >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {item.dayChangePercent >= 0 ? '+' : ''}
                      {item.dayChangePercent.toFixed(1)}%
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CENTER COLUMN: Unified Strike Table */}
        <div className="md:col-span-3 border-r border-gray-200 dark:border-gray-800 pr-4 flex flex-col" style={{ height: 'calc(100vh - 60px)' }}>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {selectedTicker ? `${selectedTicker} Options` : 'Select a ticker'}
              </h2>
              {selectedTicker && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedType('call')}
                    className={`px-3 py-1 rounded text-sm font-semibold transition ${
                      selectedType === 'call'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    Call
                  </button>
                  <button
                    onClick={() => setSelectedType('put')}
                    className={`px-3 py-1 rounded text-sm font-semibold transition ${
                      selectedType === 'put'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    Put
                  </button>
                </div>
              )}
            </div>
            {selectedTicker && (
              <div className="flex gap-2 mb-3">
                <button
                  onClick={handleJumpToITM}
                  className="px-3 py-1 text-xs rounded font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60 transition"
                >
                  ITM
                </button>
                <button
                  onClick={handleJumpToATM}
                  className="px-3 py-1 text-xs rounded font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition"
                >
                  ATM
                </button>
                <button
                  onClick={handleJumpToOTM}
                  className="px-3 py-1 text-xs rounded font-semibold bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/60 transition"
                >
                  OTM
                </button>
              </div>
            )}
          </div>

          {selectedTicker && allChainsLoading ? (
            <HeatMapSkeleton />
          ) : selectedTicker && allChains.length > 0 && filteredStrikes.length > 0 ? (
            <>
              <div
                ref={tableContainerRef}
                className="w-full overflow-auto border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 max-h-[68vh]"
              >
                <table className="border-collapse text-xs w-full">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 sticky top-0 z-20">
                      <th className="px-3 py-3 text-left font-bold text-gray-900 dark:text-gray-100 w-24 sticky left-0 bg-gray-100 dark:bg-gray-800 z-20 border-r border-gray-300 dark:border-gray-600">
                        Expiry
                      </th>
                      {filteredStrikes.slice(displayScrollIndex, displayScrollIndex + 12).map((strike) => {
                        const status = getStrikeStatus(strike);
                        const isATM = status === 'atm';
                        return (
                          <th
                            key={`header-${strike}`}
                            data-strike={strike}
                            className={`px-3 py-3 text-center font-bold min-w-[110px] ${getHeaderColor(strike)} ${isATM ? 'border-l-4 border-l-black dark:border-l-white border-r-4 border-r-black dark:border-r-white' : 'border-r border-gray-200 dark:border-gray-700'}`}
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
                    {allChains.map((item) => (
                      <tr
                        key={item.expiry}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="px-3 py-2 font-bold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800/50 sticky left-0 z-10 border-r border-gray-300 dark:border-gray-600 text-sm whitespace-nowrap">
                          <div>{new Date(item.expiry + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                          <div className="text-xs font-normal text-gray-600 dark:text-gray-400">
                            ({item.daysToExpiry}d)
                          </div>
                        </td>
                        {filteredStrikes.slice(displayScrollIndex, displayScrollIndex + 12).map((strike) => {
                          const key = (selectedType + 's') as 'calls' | 'puts';
                          const chainOptions = item.chain?.[key];
                          const option = Array.isArray(chainOptions)
                            ? chainOptions.find((o) => o.strike === strike)
                            : undefined;
                          const metrics = option ? calculateMetrics(option, item.daysToExpiry) : null;
                          const status = getStrikeStatus(strike);
                          const isATM = status === 'atm';

                          return (
                            <td
                              key={`cell-${item.expiry}-${strike}`}
                              className={`px-3 py-2 text-center cursor-pointer transition hover:shadow-md ${
                                metrics ? getCellColor(metrics.profitPercent) : 'bg-gray-50 dark:bg-gray-800'
                              } ${isATM ? 'border-l-4 border-l-black dark:border-l-white border-r-4 border-r-black dark:border-r-white' : 'border-r border-gray-200 dark:border-gray-700'}`}
                              onClick={() => option && handleStrikeClick(strike, selectedType === 'call')}
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
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Strike Navigation Controls */}
              <div className="mt-3 flex gap-2 items-center justify-between">
                <button
                  onClick={() => setStrikeScrollIndex(Math.max(0, displayScrollIndex - 6))}
                  disabled={displayScrollIndex === 0}
                  className={`px-2 py-1 rounded font-bold transition text-sm ${
                    displayScrollIndex > 0
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
                >
                  ← Lower
                </button>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Strikes: ${filteredStrikes[displayScrollIndex]?.toFixed(0) || '—'} to ${filteredStrikes[Math.min(displayScrollIndex + 11, filteredStrikes.length - 1)]?.toFixed(0) || '—'}
                </div>
                <button
                  onClick={() => setStrikeScrollIndex(Math.min(maxScrollIndex, displayScrollIndex + 6))}
                  disabled={displayScrollIndex >= maxScrollIndex}
                  className={`px-2 py-1 rounded font-bold transition text-sm ${
                    displayScrollIndex < maxScrollIndex
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Higher →
                </button>
              </div>

              {/* Legend - At bottom */}
              <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-4">
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
            </>
          ) : (
            <div className="text-center text-gray-500 py-8 text-sm">
              {selectedTicker ? 'No chain data available' : 'Select a ticker'}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Order Builder */}
        <div className="md:col-span-1 flex flex-col" style={{ height: 'calc(100vh - 60px)' }}>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Order Builder
            </h2>
          </div>

          {selectedTicker && selectedStrike && currentPrice ? (
            <div className="flex-1 space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-y-auto">
              {/* Ticker & Expiry Summary */}
              <div className="text-sm">
                <div className="font-bold text-gray-900 dark:text-gray-100">
                  {selectedTicker} @ ${currentPrice.toFixed(2)}
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
                  placeholder="Click table or enter"
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
            <div className="flex-1 text-center text-gray-500 py-8 text-sm">
              Click a strike to place an order
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
