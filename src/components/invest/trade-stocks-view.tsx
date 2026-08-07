'use client';

import { useState, useEffect } from 'react';
import type { HoldingWithValue } from '@/lib/holdings';
import { RealtimeQuoteTicker } from './realtime-quote-ticker';
import { StockTradingForm } from './stock-trading-form';
import { CurrentHoldingsForTrading } from './current-holdings-for-trading';

interface TradeStocksViewProps {
  holdings: HoldingWithValue[];
  accountId: string | null;
}

export function TradeStocksView({ holdings: initialHoldings, accountId }: TradeStocksViewProps) {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentHoldings, setCurrentHoldings] = useState<HoldingWithValue[]>(initialHoldings);
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(false);

  const fetchHoldings = async () => {
    try {
      setIsLoadingHoldings(true);
      const res = await fetch('/api/investments/alpaca-positions');
      if (res.ok) {
        const data = await res.json();
        const alpacaPositions = data.positions || [];

        // Convert Alpaca positions to HoldingWithValue format
        const convertedHoldings: HoldingWithValue[] = alpacaPositions.map((pos: any, idx: number) => ({
          id: idx,
          symbol: pos.symbol,
          name: pos.symbol,
          assetClass: pos.assetClass || 'equity',
          shares: pos.qty,
          costBasis: pos.costBasis,
          currentPrice: pos.currentPrice,
          currentValue: pos.marketValue,
          gainLoss: pos.unrealizedPl,
          gainLossPct: pos.unrealizedPlpc * 100,
          acquisitionDate: new Date(),
        }));

        setCurrentHoldings(convertedHoldings);
      }
    } catch (error) {
      console.error('Failed to fetch updated holdings:', error);
    } finally {
      setIsLoadingHoldings(false);
    }
  };

  const handleTradeExecuted = async () => {
    setRefreshKey((k) => k + 1);
    // Refresh holdings after a short delay to allow Alpaca to process the order
    setTimeout(() => {
      fetchHoldings();
    }, 1000);
  };

  return (
    <>
      {/* Paper Trading Mode Warning Banner */}
      <div className="mb-8 p-4 rounded-lg border-2 border-amber-600/40 bg-amber-600/10">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div className="flex-1">
            <h3 className="font-bold text-amber-900 dark:text-amber-100 mb-1">Paper Trading Mode (Simulated Funds)</h3>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              This trading interface uses simulated funds for practice only. No real money or positions are involved. Orders are executed through Alpaca's paper trading API.
            </p>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground mb-8">Buy and sell stocks in your portfolio</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Trading Form */}
        <div className="lg:col-span-1">
          <StockTradingForm
            accountId={accountId}
            onTradeExecuted={handleTradeExecuted}
            onSymbolChange={setSelectedSymbol}
          />
        </div>

        {/* Real-time Quote Ticker */}
        <div className="lg:col-span-2">
          <RealtimeQuoteTicker
            key={refreshKey}
            symbol={selectedSymbol}
            onQuoteUpdate={(quote) => {
              // Update form with current quote if needed
            }}
          />
        </div>
      </div>

      {/* Current Holdings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Current Holdings</h2>
          <button
            onClick={fetchHoldings}
            disabled={isLoadingHoldings}
            className="text-xs px-3 py-1 rounded bg-muted text-muted-foreground hover:bg-muted-foreground hover:text-background disabled:opacity-50"
          >
            {isLoadingHoldings ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <CurrentHoldingsForTrading holdings={currentHoldings} />
      </div>
    </>
  );
}
