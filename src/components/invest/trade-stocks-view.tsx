'use client';

import { useState } from 'react';
import type { HoldingWithValue } from '@/lib/holdings';
import { RealtimeQuoteTicker } from './realtime-quote-ticker';
import { StockTradingForm } from './stock-trading-form';
import { CurrentHoldingsForTrading } from './current-holdings-for-trading';

interface TradeStocksViewProps {
  holdings: HoldingWithValue[];
  accountId: string | null;
}

export function TradeStocksView({ holdings, accountId }: TradeStocksViewProps) {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTradeExecuted = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <>
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
        <h2 className="text-lg font-semibold text-foreground mb-4">Current Holdings</h2>
        <CurrentHoldingsForTrading holdings={holdings} />
      </div>
    </>
  );
}
