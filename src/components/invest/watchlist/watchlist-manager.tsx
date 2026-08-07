'use client';

import { useMemo } from 'react';
import { WatchlistTable } from './watchlist-table';
import { useWatchList } from '@/lib/watch-list-context';
import { generateMockStockData } from '@/lib/ticker-data';

interface WatchlistManagerProps {
  onSelectTicker?: (ticker: string) => void;
}

export function WatchlistManager({ onSelectTicker }: WatchlistManagerProps) {
  const { watchList, removeFromWatchList } = useWatchList();

  // Generate watch list items from tickers
  const items = useMemo(() => {
    return watchList.map((ticker) => generateMockStockData(ticker));
  }, [watchList]);

  const handleSelect = (ticker: string) => {
    onSelectTicker?.(ticker);
  };

  const handleRemove = (ticker: string) => {
    removeFromWatchList(ticker);
  };

  return (
    <WatchlistTable
      items={items}
      onSelect={handleSelect}
      onRemove={handleRemove}
    />
  );
}
