import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface StockQuote {
  ticker: string;
  name: string;
  currentPrice: number;
  dayChange: number;
  dayChangePercent: number;
  volume: number;
}

export interface OptionStrike {
  strike: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface OptionChain {
  calls: OptionStrike[];
  puts: OptionStrike[];
  currentPrice: number;
  daysToExpiry: number;
}

// Helper: Convert yahoo-finance2 option data to our interface
function parseOptionContract(contract: any): OptionStrike {
  return {
    strike: contract.strike,
    bid: contract.bid || 0,
    ask: contract.ask || 0,
    volume: contract.volume || 0,
    openInterest: contract.openInterest || 0,
    impliedVolatility: contract.impliedVolatility || 0,
    delta: contract.delta || 0,
    gamma: contract.gamma,
    theta: contract.theta,
    vega: contract.vega,
  };
}

export async function getStockQuote(ticker: string): Promise<StockQuote> {
  try {
    const data = await yahooFinance.quote(ticker);

    if (!data || !data.regularMarketPrice) {
      throw new Error(`No quote data for ${ticker}`);
    }

    return {
      ticker,
      name: data.longName || ticker,
      currentPrice: data.regularMarketPrice,
      dayChange: data.regularMarketChange || 0,
      dayChangePercent: data.regularMarketChangePercent || 0,
      volume: data.regularMarketVolume || 0,
    };
  } catch (error) {
    console.error(`Failed to fetch quote for ${ticker}:`, error);
    throw error;
  }
}

export async function getOptionExpirations(
  ticker: string
): Promise<string[]> {
  try {
    const options = await yahooFinance.options(ticker);
    if (!options?.expirationDates) {
      return [];
    }

    // Convert Date objects to ISO date strings, sort nearest-first
    return options.expirationDates
      .map((dateOrTimestamp: Date | number) => {
        const date = dateOrTimestamp instanceof Date
          ? dateOrTimestamp
          : new Date(dateOrTimestamp * 1000);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      })
      .sort();
  } catch (error) {
    console.error(`Failed to fetch option expirations for ${ticker}:`, error);
    throw error;
  }
}

export async function getOptionChain(
  ticker: string,
  expiryDate: string
): Promise<OptionChain> {
  try {
    const chainData = await yahooFinance.options(ticker);
    if (!chainData) {
      throw new Error(`No option chain for ${ticker}`);
    }

    const quote = chainData.quote;
    if (!quote) {
      throw new Error(`No quote data in chain for ${ticker}`);
    }

    const currentPrice = quote.regularMarketPrice || 0;

    // Find the expiry matching the requested date
    const expiryObj = chainData.options?.find((exp: any) => {
      const expDate = exp.expirationDate instanceof Date
        ? exp.expirationDate
        : new Date(exp.expirationDate * 1000);
      return expDate.toISOString().split('T')[0] === expiryDate;
    });

    if (!expiryObj) {
      throw new Error(`No options for ${ticker} on ${expiryDate}`);
    }

    // Use ALL available strikes from Yahoo Finance (no filtering)
    const allOptions = (expiryObj.calls || []).concat(expiryObj.puts || []);
    const filtered = allOptions;

    // Separate calls and puts
    const calls = filtered
      .filter((opt: any) => opt.option_type === 'call' || (opt.bid !== undefined && opt.bid !== null))
      .sort((a: any, b: any) => a.strike - b.strike)
      .map(parseOptionContract);

    const puts = filtered
      .filter((opt: any) => opt.option_type === 'put' || (opt.bid !== undefined && opt.bid !== null))
      .sort((a: any, b: any) => a.strike - b.strike)
      .map(parseOptionContract);

    // Calculate days to expiry
    const expiryDate_ = expiryObj.expirationDate instanceof Date
      ? expiryObj.expirationDate.getTime()
      : expiryObj.expirationDate * 1000;
    const daysToExpiry = Math.ceil(
      (expiryDate_ - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return {
      calls,
      puts,
      currentPrice,
      daysToExpiry,
    };
  } catch (error) {
    console.error(
      `Failed to fetch option chain for ${ticker} (${expiryDate}):`,
      error
    );
    throw error;
  }
}
