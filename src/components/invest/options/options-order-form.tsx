'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { OptionsGuideModal } from './options-guide-modal';
import type { OrderStrategy, OrderState, OrderType } from '@/lib/options-types';

interface OptionsOrderFormProps {
  ticker: string;
  currentPrice?: number;
  onSubmit?: (order: OrderState) => void;
  isLoading?: boolean;
}

export function OptionsOrderForm({
  ticker,
  currentPrice = 0,
  onSubmit,
  isLoading = false,
}: OptionsOrderFormProps) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const [formState, setFormState] = useState<OrderState>({
    strategy: 'cash_secured_put',
    ticker,
    expiry: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    strike: Math.round(currentPrice * 100) / 100,
    orderType: 'market',
    quantity: 1,
  });

  const handleStrategyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormState({
      ...formState,
      strategy: e.target.value as OrderStrategy,
    });
  };

  const handleOrderTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormState({
      ...formState,
      orderType: e.target.value as OrderType,
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({
      ...formState,
      expiry: new Date(e.target.value),
    });
  };

  const handleStrikeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({
      ...formState,
      strike: parseFloat(e.target.value) || 0,
    });
  };

  const handleLimitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({
      ...formState,
      limitPrice: parseFloat(e.target.value) || undefined,
    });
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({
      ...formState,
      quantity: parseInt(e.target.value) || 1,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formState);
  };

  const calculateTotalPremium = () => {
    if (formState.limitPrice) {
      return formState.limitPrice * 100 * formState.quantity;
    }
    return null;
  };

  const calculateDailyIncome = () => {
    const total = calculateTotalPremium();
    if (!total) return null;
    const dte = Math.ceil((formState.expiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return dte > 0 ? total / dte : null;
  };

  const daysToExpiry = Math.ceil((formState.expiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

  const getStrategyLabel = (strategy: OrderStrategy) => {
    switch (strategy) {
      case 'cash_secured_put':
        return 'Cash Secured Put';
      case 'covered_call':
        return 'Covered Call';
      case 'buy_call':
        return 'Buy to Call';
      default:
        return strategy;
    }
  };

  const minDate = new Date().toISOString().split('T')[0];
  const currentDateStr = formState.expiry.toISOString().split('T')[0];

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Strategy Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label htmlFor="strategy" className="block text-sm font-semibold text-neutral-900 dark:text-white">
              Strategy
            </label>
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900/50"
              title="Open Options Guide"
              aria-label="Open Options Guide"
            >
              <HelpCircle size={18} />
            </button>
          </div>
          <select
            id="strategy"
            value={formState.strategy}
            onChange={handleStrategyChange}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
          >
            <option value="cash_secured_put">Cash Secured Put</option>
            <option value="covered_call">Covered Call</option>
            <option value="buy_call">Buy to Call</option>
          </select>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {formState.strategy === 'cash_secured_put' && 'Sell put contracts against reserved cash'}
            {formState.strategy === 'covered_call' && 'Sell call contracts against owned shares'}
            {formState.strategy === 'buy_call' && 'Purchase call contracts for upside exposure'}
          </p>
        </div>

        {/* Ticker and Current Price */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-neutral-900 dark:text-white">
              Ticker
            </label>
            <div className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 text-neutral-900 dark:text-white text-sm font-mono">
              {formState.ticker}
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-neutral-900 dark:text-white">
              Current Price
            </label>
            <div className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 text-neutral-900 dark:text-white text-sm font-mono">
              ${currentPrice.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Expiration and Strike */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="expiry" className="block text-sm font-semibold text-neutral-900 dark:text-white">
                Expiration Date
              </label>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                {daysToExpiry} DTE
              </span>
            </div>
            <input
              id="expiry"
              type="date"
              value={currentDateStr}
              onChange={handleDateChange}
              min={minDate}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="strike" className="block text-sm font-semibold text-neutral-900 dark:text-white">
              Strike Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-neutral-500 dark:text-neutral-400 text-sm">$</span>
              <input
                id="strike"
                type="number"
                step="0.01"
                value={formState.strike}
                onChange={handleStrikeChange}
                className="w-full pl-6 pr-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Order Type and Limit Price */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="orderType" className="block text-sm font-semibold text-neutral-900 dark:text-white">
              Order Type
            </label>
            <select
              id="orderType"
              value={formState.orderType}
              onChange={handleOrderTypeChange}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
            >
              <option value="market">Market</option>
              <option value="limit">Limit</option>
            </select>
          </div>

          {formState.orderType === 'limit' && (
            <div className="space-y-2">
              <label htmlFor="limitPrice" className="block text-sm font-semibold text-neutral-900 dark:text-white">
                Limit Price (per share)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-neutral-500 dark:text-neutral-400 text-sm">$</span>
                <input
                  id="limitPrice"
                  type="number"
                  step="0.01"
                  value={formState.limitPrice || ''}
                  onChange={handleLimitPriceChange}
                  className="w-full pl-6 pr-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <label htmlFor="quantity" className="block text-sm font-semibold text-neutral-900 dark:text-white">
            Quantity (contracts)
          </label>
          <input
            id="quantity"
            type="number"
            min="1"
            value={formState.quantity}
            onChange={handleQuantityChange}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Each contract represents 100 shares
          </p>
        </div>

        {/* Calculations Summary */}
        {formState.orderType === 'limit' && formState.limitPrice && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900/30 space-y-3">
            <div className="text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-neutral-700 dark:text-neutral-300">Total Premium:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  ${calculateTotalPremium()?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-700 dark:text-neutral-300">Daily Income (if held to expiry):</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {calculateDailyIncome() ? `$${calculateDailyIncome()?.toFixed(2)}` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Submission Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-400 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          {isLoading ? 'Submitting...' : 'Place Order'}
        </button>
      </form>

      {/* Options Guide Modal */}
      <OptionsGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </>
  );
}
