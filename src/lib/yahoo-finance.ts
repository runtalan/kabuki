import yahooFinance from 'yahoo-finance2';

export interface RealtimeQuote {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  regularMarketOpen: number;
  regularMarketPreviousClose: number;
  bid?: number;
  ask?: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  currency?: string;
  marketState?: string;
}

export interface OptionContract {
  contractSymbol: string;
  strike: number;
  currency?: string;
  lastPrice: number;
  change: number;
  percentChange: number;
  volume?: number;
  openInterest?: number;
  bid?: number;
  ask?: number;
  impliedVolatility?: number;
  inTheMoney: boolean;
  expiration: Date;
}

export interface OptionChainResult {
  underlyingSymbol: string;
  underlyingPrice: number;
  expirationDates: string[]; // ISO date strings (YYYY-MM-DD)
  selectedExpiration: string;
  calls: OptionContract[];
  puts: OptionContract[];
}

/**
 * Fetch real-time market quote(s) for a given set of symbols
 */
export async function getRealtimeQuotes(symbols: string[]): Promise<RealtimeQuote[]> {
  if (!symbols || !symbols.length) return [];

  const cleanSymbols = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()))).filter(Boolean);
  if (!cleanSymbols.length) return [];

  try {
    const rawQuotes = await yahooFinance.quote(cleanSymbols);
    const quotesArray = Array.isArray(rawQuotes) ? rawQuotes : [rawQuotes];

    return quotesArray.map((q: any) => ({
      symbol: q.symbol,
      shortName: q.shortName || q.longName || q.symbol,
      regularMarketPrice: q.regularMarketPrice ?? 0,
      regularMarketChange: q.regularMarketChange ?? 0,
      regularMarketChangePercent: q.regularMarketChangePercent ?? 0,
      regularMarketDayHigh: q.regularMarketDayHigh ?? 0,
      regularMarketDayLow: q.regularMarketDayLow ?? 0,
      regularMarketVolume: q.regularMarketVolume ?? 0,
      regularMarketOpen: q.regularMarketOpen ?? 0,
      regularMarketPreviousClose: q.regularMarketPreviousClose ?? 0,
      bid: q.bid,
      ask: q.ask,
      marketCap: q.marketCap,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow,
      currency: q.currency || 'USD',
      marketState: q.marketState,
    }));
  } catch (err: any) {
    console.error('Error fetching Yahoo Finance quotes:', err);
    throw new Error(`Failed to fetch quotes from Yahoo Finance: ${err?.message || err}`);
  }
}

/**
 * Fetch full options chain for a symbol, optionally filtered by expiration date
 */
export async function getOptionChain(symbol: string, dateStr?: string): Promise<OptionChainResult> {
  const cleanSymbol = symbol.trim().toUpperCase();
  if (!cleanSymbol) {
    throw new Error('Symbol parameter is required');
  }

  const queryOptions: any = {};
  if (dateStr) {
    queryOptions.date = new Date(dateStr);
  }

  try {
    const result: any = await yahooFinance.options(cleanSymbol, queryOptions);

    const rawExpDates: Date[] = result.expirationDates || [];
    const expirationDates = rawExpDates.map((d: Date) => {
      return d instanceof Date ? d.toISOString().split('T')[0] : new Date(d).toISOString().split('T')[0];
    });

    const chain = result.options?.[0] || { calls: [], puts: [] };
    const expirationDate = chain.expirationDate ? new Date(chain.expirationDate) : new Date();

    const formatContract = (c: any): OptionContract => ({
      contractSymbol: c.contractSymbol,
      strike: c.strike,
      currency: c.currency || 'USD',
      lastPrice: c.lastPrice ?? 0,
      change: c.change ?? 0,
      percentChange: c.percentChange ?? 0,
      volume: c.volume,
      openInterest: c.openInterest,
      bid: c.bid,
      ask: c.ask,
      impliedVolatility: c.impliedVolatility,
      inTheMoney: Boolean(c.inTheMoney),
      expiration: expirationDate,
    });

    return {
      underlyingSymbol: cleanSymbol,
      underlyingPrice: result.quote?.regularMarketPrice ?? 0,
      expirationDates,
      selectedExpiration: expirationDate.toISOString().split('T')[0],
      calls: (chain.calls || []).map(formatContract),
      puts: (chain.puts || []).map(formatContract),
    };
  } catch (err: any) {
    console.error(`Error fetching option chain for ${cleanSymbol}:`, err);
    throw new Error(`Failed to fetch option chain for ${cleanSymbol}: ${err?.message || err}`);
  }
}

/**
 * Fetch historical chart data for charts & candles
 */
export async function getHistoricalChart(
  symbol: string,
  period1: string = '1m', // '1d' | '5d' | '1m' | '6m' | '1y' | '5y'
  interval: string = '1d'
) {
  const cleanSymbol = symbol.trim().toUpperCase();
  if (!cleanSymbol) {
    throw new Error('Symbol parameter is required');
  }

  // Calculate start date based on period string
  const now = new Date();
  let startDate = new Date();

  switch (period1) {
    case '1d':
      startDate.setDate(now.getDate() - 1);
      break;
    case '5d':
      startDate.setDate(now.getDate() - 5);
      break;
    case '1m':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case '6m':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case '5y':
      startDate.setFullYear(now.getFullYear() - 5);
      break;
    default:
      startDate.setMonth(now.getMonth() - 1);
  }

  try {
    const chartResult: any = await yahooFinance.chart(cleanSymbol, {
      period1: startDate,
      period2: now,
      interval: interval as any,
    });

    return {
      symbol: cleanSymbol,
      meta: chartResult.meta,
      quotes: (chartResult.quotes || []).map((q: any) => ({
        date: q.date,
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume,
      })),
    };
  } catch (err: any) {
    console.error(`Error fetching historical chart for ${cleanSymbol}:`, err);
    throw new Error(`Failed to fetch chart for ${cleanSymbol}: ${err?.message || err}`);
  }
}

/**
 * Ticker search autocomplete
 */
export async function searchSymbols(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const searchResult: any = await yahooFinance.search(trimmed);
    return (searchResult.quotes || [])
      .filter((q: any) => q.symbol)
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchDisp || q.exchange,
        type: q.typeDisp || q.quoteType,
      }));
  } catch (err: any) {
    console.error(`Error searching symbol query "${query}":`, err);
    throw new Error(`Failed to search symbols: ${err?.message || err}`);
  }
}
