'use client';

import { useRouter } from 'next/navigation';
import { WatchlistManager } from './watchlist-manager';

export function WatchlistManagerWrapper() {
  const router = useRouter();

  const handleSelectTicker = (ticker: string) => {
    // Redirect to options page with the ticker selected
    router.push(`/invest/options?ticker=${ticker}`);
  };

  return <WatchlistManager onSelectTicker={handleSelectTicker} />;
}
