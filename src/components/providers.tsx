'use client';

import { WatchListProvider } from '@/lib/watch-list-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return <WatchListProvider>{children}</WatchListProvider>;
}
