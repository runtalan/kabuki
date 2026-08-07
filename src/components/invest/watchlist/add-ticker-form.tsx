'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useWatchList } from '@/lib/watch-list-context';

export function AddTickerForm() {
  const [ticker, setTicker] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { addToWatchList, isInWatchList } = useWatchList();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedTicker = ticker.toUpperCase().trim();

    if (normalizedTicker && !isInWatchList(normalizedTicker)) {
      addToWatchList(normalizedTicker);
      setTicker('');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6">
      <label className="block text-sm font-semibold text-neutral-900 dark:text-white">
        Add Ticker to Watch List
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="e.g., AAPL, GOOGL, TSLA"
          className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!ticker.trim()}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>
      {submitted && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          ✓ {ticker} added to watch list
        </p>
      )}
      {ticker && isInWatchList(ticker) && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {ticker} is already in your watch list
        </p>
      )}
    </form>
  );
}
