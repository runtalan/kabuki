'use client';

import { Star } from 'lucide-react';
import { useWatchList } from '@/lib/watch-list-context';

interface TickerWatchListButtonProps {
  ticker: string;
  showLabel?: boolean;
}

export function TickerWatchListButton({
  ticker,
  showLabel = false,
}: TickerWatchListButtonProps) {
  const { isInWatchList, toggleWatchList } = useWatchList();
  const inWatchList = isInWatchList(ticker);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleWatchList(ticker);
      }}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded transition-colors ${
        inWatchList
          ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50'
          : 'text-neutral-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-950/30'
      }`}
      title={inWatchList ? 'Remove from Watch List' : 'Add to Watch List'}
      aria-label={inWatchList ? 'Remove from Watch List' : 'Add to Watch List'}
    >
      <Star
        className={`w-4 h-4 ${inWatchList ? 'fill-current' : ''}`}
      />
      {showLabel && (
        <span className="text-sm font-medium">
          {inWatchList ? 'In Watch List' : 'Add to Watch List'}
        </span>
      )}
    </button>
  );
}
