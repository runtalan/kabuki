import yf from 'yahoo-finance2';

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
    const quote = await yf.quote({
      symbols: [ticker],
      modules: ['price', 'quoteSummary'],
    });

    const data = quote[ticker];
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
    const options = await yf.options({ symbol: ticker });
    if (!options?.result?.[0]?.expirationDates) {
      return [];
    }

    // Convert timestamps to ISO date strings, sort nearest-first
    return options.result[0].expirationDates
      .map((timestamp: number) => {
        const date = new Date(timestamp * 1000);
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
  expiryDate: string,
  atmWindow: number = 5
): Promise<OptionChain> {
  try {
    const options = await yf.options({ symbol: ticker });
    if (!options?.result?.[0]) {
      throw new Error(`No option chain for ${ticker}`);
    }

    const chainData = options.result[0];
    const quote = chainData.quote;

    if (!quote) {
      throw new Error(`No quote data in chain for ${ticker}`);
    }

    const currentPrice = quote.regularMarketPrice || 0;
    const atmStrike = Math.round(currentPrice);

    // Find the expiry matching the requested date
    const expiryObj = chainData.options?.find((exp: any) => {
      const expDate = new Date(exp.expirationDate * 1000);
      return expDate.toISOString().split('T')[0] === expiryDate;
    });

    if (!expiryObj) {
      throw new Error(`No options for ${ticker} on ${expiryDate}`);
    }

    // Filter to ATM ± atmWindow strikes only
    const allOptions = expiryObj.calls?.concat(expiryObj.puts || []) || [];
    const filtered = allOptions.filter((opt: any) => {
      const strike = opt.strike;
      return strike >= atmStrike - atmWindow && strike <= atmStrike + atmWindow;
    });

    // Separate calls and puts
    const calls = filtered
      .filter((opt: any) => opt.option_type === 'call' || opt.bid !== undefined)
      .sort((a: any, b: any) => a.strike - b.strike)
      .map(parseOptionContract);

    const puts = filtered
      .filter((opt: any) => opt.option_type === 'put' || opt.bid !== undefined)
      .sort((a: any, b: any) => a.strike - b.strike)
      .map(parseOptionContract);

    // Calculate days to expiry
    const expiryTimestamp = expiryObj.expirationDate * 1000;
    const daysToExpiry = Math.ceil(
      (expiryTimestamp - Date.now()) / (1000 * 60 * 60 * 24)
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
