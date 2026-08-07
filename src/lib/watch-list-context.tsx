'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface WatchListContextType {
  watchList: string[];
  isInWatchList: (ticker: string) => boolean;
  addToWatchList: (ticker: string) => void;
  removeFromWatchList: (ticker: string) => void;
  toggleWatchList: (ticker: string) => void;
}

const WatchListContext = createContext<WatchListContextType | undefined>(undefined);

const STORAGE_KEY = 'kabuki_watchlist';

export function WatchListProvider({ children }: { children: React.ReactNode }) {
  const [watchList, setWatchList] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setWatchList(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Failed to load watch list from storage:', err);
      }
      setIsLoaded(true);
    }
  }, []);

  // Save to local storage when watch list changes
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(watchList));
      } catch (err) {
        console.error('Failed to save watch list to storage:', err);
      }
    }
  }, [watchList, isLoaded]);

  const isInWatchList = useCallback((ticker: string) => {
    return watchList.includes(ticker.toUpperCase());
  }, [watchList]);

  const addToWatchList = useCallback((ticker: string) => {
    const normalizedTicker = ticker.toUpperCase();
    setWatchList((prev) => {
      if (prev.includes(normalizedTicker)) return prev;
      return [...prev, normalizedTicker];
    });
  }, []);

  const removeFromWatchList = useCallback((ticker: string) => {
    const normalizedTicker = ticker.toUpperCase();
    setWatchList((prev) => prev.filter((t) => t !== normalizedTicker));
  }, []);

  const toggleWatchList = useCallback((ticker: string) => {
    const normalizedTicker = ticker.toUpperCase();
    setWatchList((prev) => {
      if (prev.includes(normalizedTicker)) {
        return prev.filter((t) => t !== normalizedTicker);
      }
      return [...prev, normalizedTicker];
    });
  }, []);

  return (
    <WatchListContext.Provider
      value={{
        watchList,
        isInWatchList,
        addToWatchList,
        removeFromWatchList,
        toggleWatchList,
      }}
    >
      {children}
    </WatchListContext.Provider>
  );
}

export function useWatchList() {
  const context = useContext(WatchListContext);
  if (!context) {
    throw new Error('useWatchList must be used within WatchListProvider');
  }
  return context;
}
