'use client';

import { useState } from 'react';

interface StockTradingFormProps {
  accountId: string | null;
  onTradeExecuted?: () => void;
}

export function StockTradingForm({ accountId, onTradeExecuted }: StockTradingFormProps) {
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!accountId) {
      setError('No brokerage account found');
      return;
    }

    setIsSubmitting(true);

    try {
      const qty = parseFloat(quantity);

      if (!symbol || !qty || qty <= 0) {
        throw new Error('Please enter valid symbol and quantity');
      }

      if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
        throw new Error('Please enter valid limit price');
      }

      const res = await fetch('/api/investments/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          symbol: symbol.toUpperCase(),
          instrumentType: 'equity',
          side,
          quantity: qty,
          // Market orders omit price so the endpoint fetches the live quote.
          ...(orderType === 'limit' ? { price: parseFloat(limitPrice) } : {}),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Trade execution failed');
      }

      setSuccess(result.message ?? `${side === 'buy' ? 'Bought' : 'Sold'} ${qty} shares of ${symbol.toUpperCase()}`);
      setSymbol('');
      setQuantity('');
      setLimitPrice('');
      onTradeExecuted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trade execution failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">Execute Trade</h2>

      {/* Side Selection */}
      <div className="mb-6">
        <label className="text-sm font-medium text-foreground mb-2 block">Side</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setSide('buy')}
            className={`flex-1 py-2 px-3 rounded-lg border-2 font-medium transition-colors ${
              side === 'buy'
                ? 'border-emerald-600 bg-emerald-600/10 text-emerald-600'
                : 'border-border bg-muted text-muted-foreground'
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setSide('sell')}
            className={`flex-1 py-2 px-3 rounded-lg border-2 font-medium transition-colors ${
              side === 'sell'
                ? 'border-red-600 bg-red-600/10 text-red-600'
                : 'border-border bg-muted text-muted-foreground'
            }`}
          >
            Sell
          </button>
        </div>
      </div>

      {/* Symbol */}
      <div className="mb-4">
        <label className="text-sm font-medium text-foreground mb-2 block">Symbol</label>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="e.g., AAPL"
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isSubmitting}
        />
      </div>

      {/* Quantity */}
      <div className="mb-4">
        <label className="text-sm font-medium text-foreground mb-2 block">Quantity</label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0"
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isSubmitting}
        />
      </div>

      {/* Order Type */}
      <div className="mb-4">
        <label className="text-sm font-medium text-foreground mb-2 block">Order Type</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setOrderType('market')}
            className={`flex-1 py-2 px-3 rounded-lg border font-medium transition-colors ${
              orderType === 'market'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-muted text-muted-foreground'
            }`}
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => setOrderType('limit')}
            className={`flex-1 py-2 px-3 rounded-lg border font-medium transition-colors ${
              orderType === 'limit'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-muted text-muted-foreground'
            }`}
          >
            Limit
          </button>
        </div>
      </div>

      {/* Limit Price (conditional) */}
      {orderType === 'limit' && (
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground mb-2 block">Limit Price</label>
          <input
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isSubmitting}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-600/10 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-600/10 text-emerald-600 text-sm">
          {success}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || !accountId}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
          side === 'buy'
            ? 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
            : 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'
        }`}
      >
        {isSubmitting ? 'Processing...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${quantity || '0'} ${symbol}`}
      </button>
    </form>
  );
}
