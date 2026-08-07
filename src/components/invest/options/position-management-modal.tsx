'use client';

import { X } from 'lucide-react';
import type { Holding } from '@/lib/options-types';

interface PositionManagementModalProps {
  holding: Holding | null;
  isOpen: boolean;
  onClose: () => void;
  onViewChain?: () => void;
  onRoll?: () => void;
}

export function PositionManagementModal({
  holding,
  isOpen,
  onClose,
  onViewChain,
  onRoll,
}: PositionManagementModalProps) {
  if (!isOpen || !holding) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            {holding.ticker} - Position Management
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded transition-colors"
          >
            <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>

        {/* Position Details */}
        <div className="p-6 space-y-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1">
                Quantity
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {holding.quantity}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1">
                Current Price
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {formatCurrency(holding.currentPrice)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1">
                Position Value
              </p>
              <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                {formatCurrency(holding.totalValue)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1">
                Unrealized P&L
              </p>
              <div className="flex items-center gap-1">
                <p className={`text-lg font-semibold ${holding.unrealizedPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(holding.unrealizedPnL)}
                </p>
                <p className={`text-sm ${holding.unrealizedPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatPercent(holding.unrealizedPnLPct)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 space-y-2">
          <button
            onClick={() => {
              onViewChain?.();
              onClose();
            }}
            className="w-full px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
          >
            View Option Chain
          </button>
          <button
            onClick={() => {
              onRoll?.();
              onClose();
            }}
            className="w-full px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-900 dark:text-white font-medium transition-colors"
          >
            Roll Position
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-900 dark:text-white font-medium transition-colors"
          >
            Close Position
          </button>
        </div>
      </div>
    </div>
  );
}
