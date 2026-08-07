'use client';

import { X } from 'lucide-react';

interface OptionsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OptionsGuideModal({ isOpen, onClose }: OptionsGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-950 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200 dark:border-neutral-800">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Options Trading Guide
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            aria-label="Close guide"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-8">
          {/* The Greeks Section */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white border-l-4 border-blue-500 pl-4">
              The Greeks
            </h3>

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900/30">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                    θ
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-neutral-900 dark:text-white mb-1">
                      Theta (Time Decay)
                    </h4>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-2">
                      The dollar amount an option decreases in value each day due to time decay.
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 italic">
                      Example: A position with theta of $2.50 loses $2.50 in value each day if the stock price remains unchanged.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-900/30">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                    Γ
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-neutral-900 dark:text-white mb-1">
                      Gamma (Acceleration Risk)
                    </h4>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-2">
                      The rate at which delta changes. Represents the risk of holding options inside 21 days to expiration.
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 italic">
                      High gamma inside 21 DTE means position delta can swing dramatically with small stock price moves—increased execution risk.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* DTE Strategy Windows */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white border-l-4 border-emerald-500 pl-4">
              DTE Strategy Windows
            </h3>

            <div className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-900/30">
                <h4 className="font-semibold text-neutral-900 dark:text-white mb-1">
                  45 DTE — The Sweet Spot
                </h4>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  Optimal entry point for income strategies. Theta decay accelerates while gamma remains manageable. Maximum time value extraction with controlled directional risk.
                </p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-900/30">
                <h4 className="font-semibold text-neutral-900 dark:text-white mb-1">
                  21 DTE — Exit Zone
                </h4>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  Gamma begins accelerating. Consider closing or rolling profitable positions. Premium collection is significantly reduced. Decision point for active management.
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-900/30">
                <h4 className="font-semibold text-neutral-900 dark:text-white mb-1">
                  7 DTE — High Risk
                </h4>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  Extreme gamma. Avoid entering new positions. High execution risk and slippage. Only close existing positions or manage critical situations.
                </p>
              </div>
            </div>
          </section>

          {/* Formulas Reference */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white border-l-4 border-purple-500 pl-4">
              Formulas Reference
            </h3>

            <div className="space-y-4">
              <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4 border border-neutral-200 dark:border-neutral-800 font-mono text-sm">
                <div className="text-neutral-600 dark:text-neutral-400 mb-2">Total Premium:</div>
                <div className="text-neutral-900 dark:text-white font-bold text-base">
                  Total Premium = Bid Price × 100
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                  One option contract controls 100 shares
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4 border border-neutral-200 dark:border-neutral-800 font-mono text-sm">
                <div className="text-neutral-600 dark:text-neutral-400 mb-2">Daily Income:</div>
                <div className="text-neutral-900 dark:text-white font-bold text-base">
                  Daily Income = Total Premium ÷ DTE
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                  Expected daily profit if held to expiration
                </div>
              </div>
            </div>
          </section>

          {/* Quick Tips */}
          <section className="space-y-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4 border border-neutral-200 dark:border-neutral-800">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Quick Tips</h3>
            <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
              <li className="flex gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>Enter positions around 45 DTE for consistent income</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>Close or roll positions when reaching 21 DTE</span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500 font-bold">!</span>
                <span>Monitor gamma risk closely inside 21 DTE</span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500 font-bold">!</span>
                <span>Avoid new entries with less than 7 DTE</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
