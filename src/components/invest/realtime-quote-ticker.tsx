'use client';

import { useEffect, useState } from 'react';
import { getRealtimeQuotes } from '@/lib/yahoo-finance';

interface QuoteData {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  change: number;
  changePercent: number;
  prevClose: number;
}

interface RealtimeQuoteTickerProps {
  symbol: string;
  onQuoteUpdate?: (quote: QuoteData) => void;
}

export function RealtimeQuoteTicker({ symbol, onQuoteUpdate }: RealtimeQuoteTickerProps) {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuote() {
      try {
        const quotes = await getRealtimeQuotes([symbol]);
        if (quotes.length > 0) {
          const q = quotes[0];
          const data: QuoteData = {
            symbol: q.symbol,
            price: q.regularMarketPrice,
            bid: q.bid,
            ask: q.ask,
            change: q.regularMarketChange,
            changePercent: q.regularMarketChangePercent,
            prevClose: q.regularMarketPreviousClose,
          };
          setQuote(data);
          onQuoteUpdate?.(data);
        }
      } catch (error) {
        console.error('Failed to fetch quote:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchQuote();
    // Refresh every 5 seconds in production, but less frequently in demo
    const interval = setInterval(fetchQuote, 5000);
    return () => clearInterval(interval);
  }, [symbol, onQuoteUpdate]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="animate-pulse space-y-2">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        Unable to fetch quote for {symbol}
      </div>
    );
  }

  const isPositive = quote.change >= 0;
  const mid = quote.bid && quote.ask ? (quote.bid + quote.ask) / 2 : quote.price;

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{symbol}</p>
          <p className="text-4xl font-bold text-foreground">${quote.price.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{quote.change.toFixed(2)}
          </p>
          <p className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Bid</p>
          <p className="text-sm font-semibold text-foreground">${quote.bid?.toFixed(2) ?? 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Ask</p>
          <p className="text-sm font-semibold text-foreground">${quote.ask?.toFixed(2) ?? 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Mid</p>
          <p className="text-sm font-semibold text-foreground">${mid.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Prev Close</p>
          <p className="text-sm font-semibold text-foreground">${quote.prevClose.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
