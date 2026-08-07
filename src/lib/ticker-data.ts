import type { WatchlistItem } from './mock-watchlist-data';

// Simple mock data generator based on ticker hash for consistency
function hashTicker(ticker: string): number {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    const char = ticker.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

const TICKER_NAMES: Record<string, string> = {
  AAPL: 'Apple Inc.',
  GOOGL: 'Alphabet Inc.',
  MSFT: 'Microsoft Corporation',
  AMZN: 'Amazon.com Inc.',
  META: 'Meta Platforms',
  TSLA: 'Tesla Inc.',
  NFLX: 'Netflix Inc.',
  NVDA: 'NVIDIA Corporation',
  QCOM: 'Qualcomm Inc.',
  AMD: 'Advanced Micro Devices',
  INTC: 'Intel Corporation',
  PYPL: 'PayPal Holdings',
  CRM: 'Salesforce Inc.',
  ADBE: 'Adobe Inc.',
  CSCO: 'Cisco Systems',
};

export function generateMockStockData(ticker: string): WatchlistItem {
  const normalizedTicker = ticker.toUpperCase();
  const hash = hashTicker(normalizedTicker);

  // Generate consistent pseudo-random values based on ticker
  const basePrice = 100 + (hash % 400);
  const priceVariation = (hash % 20) - 10;
  const dayChangePercent = (hash % 6) - 3;

  const currentPrice = basePrice + priceVariation;
  const previousClose = currentPrice - (currentPrice * (dayChangePercent / 100));
  const dayChange = currentPrice - previousClose;

  return {
    id: normalizedTicker,
    ticker: normalizedTicker,
    name: TICKER_NAMES[normalizedTicker] || `${normalizedTicker} Corp`,
    currentPrice: Math.round(currentPrice * 100) / 100,
    previousClose: Math.round(previousClose * 100) / 100,
    dayChange: Math.round(dayChange * 100) / 100,
    dayChangePercent: Math.round(dayChangePercent * 100) / 100,
    addedDate: new Date(),
  };
}
