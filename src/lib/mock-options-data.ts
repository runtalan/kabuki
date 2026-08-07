import type { Holding, OptionContract } from './options-types';

export function generateMockHoldings(): Holding[] {
  return [
    {
      id: '1',
      ticker: 'NVDA',
      assetType: 'stock',
      quantity: 50,
      avgCost: 82.5,
      currentPrice: 128.34,
      totalValue: 6417.0,
      unrealizedPnL: 2292.5,
      unrealizedPnLPct: 55.45,
    },
    {
      id: '2',
      ticker: 'AAPL',
      assetType: 'stock',
      quantity: 100,
      avgCost: 155.2,
      currentPrice: 228.92,
      totalValue: 22892.0,
      unrealizedPnL: 7372.0,
      unrealizedPnLPct: 47.45,
    },
    {
      id: '3',
      ticker: 'MSFT',
      assetType: 'stock',
      quantity: 30,
      avgCost: 380.15,
      currentPrice: 419.87,
      totalValue: 12596.1,
      unrealizedPnL: 1191.6,
      unrealizedPnLPct: 10.43,
    },
    {
      id: '4',
      ticker: 'TSLA',
      assetType: 'stock',
      quantity: 20,
      avgCost: 245.8,
      currentPrice: 198.45,
      totalValue: 3969.0,
      unrealizedPnL: -949.0,
      unrealizedPnLPct: -19.33,
    },
    {
      id: '5',
      ticker: 'SPY',
      assetType: 'stock',
      quantity: 75,
      avgCost: 425.32,
      currentPrice: 562.18,
      totalValue: 42163.5,
      unrealizedPnL: 10294.5,
      unrealizedPnLPct: 32.38,
    },
  ];
}

export function generateMockOptionContracts(ticker: string): OptionContract[] {
  const now = new Date();
  const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const expiryDates = [
    new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000),
    new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000),
    new Date(baseDate.getTime() + 21 * 24 * 60 * 60 * 1000),
    new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000),
    new Date(baseDate.getTime() + 45 * 24 * 60 * 60 * 1000),
  ];

  const currentPriceMap: Record<string, number> = {
    NVDA: 128.34,
    AAPL: 228.92,
    MSFT: 419.87,
    TSLA: 198.45,
    SPY: 562.18,
  };

  const currentPrice = currentPriceMap[ticker] || 100;
  const strikeInterval = Math.round(currentPrice * 0.05);

  const contracts: OptionContract[] = [];
  let id = 0;

  for (const expiry of expiryDates) {
    const daysToExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    const iv = 0.45 + Math.random() * 0.2;

    for (let offset = -3; offset <= 3; offset++) {
      const strike = currentPrice + offset * strikeInterval;
      if (strike <= 0) continue;

      const strikeDistance = Math.abs(strike - currentPrice) / currentPrice;
      const baseVol = Math.exp(-3 * Math.pow(strikeDistance, 2));

      const callBid = Math.max(
        0,
        currentPrice -
          strike +
          iv *
            currentPrice *
            Math.sqrt(daysToExpiry / 365) *
            (0.8 + Math.random() * 0.4) *
            baseVol
      );
      const callAsk = callBid * (1 + 0.02 + Math.random() * 0.01);

      const putBid = Math.max(
        0,
        strike -
          currentPrice +
          iv *
            currentPrice *
            Math.sqrt(daysToExpiry / 365) *
            (0.8 + Math.random() * 0.4) *
            baseVol
      );
      const putAsk = putBid * (1 + 0.02 + Math.random() * 0.01);

      const callDelta = strike <= currentPrice ? 0.6 + Math.random() * 0.4 : Math.random() * 0.4;
      const putDelta = -(1 - callDelta);

      const annualizedCallYield =
        ((callAsk / currentPrice) * 365) / daysToExpiry * 100;
      const annualizedPutYield =
        ((putAsk / (strike - currentPrice || 1)) * 365) / daysToExpiry * 100;

      const riskLevelMap = (strike: number): 'low' | 'medium' | 'high' => {
        const distance = Math.abs(strike - currentPrice) / currentPrice;
        if (distance > 0.2) return 'high';
        if (distance > 0.1) return 'medium';
        return 'low';
      };

      contracts.push({
        id: `CALL-${ticker}-${strike}-${expiry.getTime()}-${id++}`,
        ticker,
        optionType: 'call',
        strike: Math.round(strike * 100) / 100,
        expiry,
        bid: Math.round(callBid * 100) / 100,
        ask: Math.round(callAsk * 100) / 100,
        premium: Math.round(callAsk * 100) / 100,
        dailyYield: Math.round(((callAsk / currentPrice) / daysToExpiry) * 10000) / 100,
        annualizedReturn: Math.round(annualizedCallYield * 100) / 100,
        delta: Math.round(callDelta * 10000) / 10000,
        riskLevel: riskLevelMap(strike),
        volume: Math.floor(Math.random() * 5000) + 100,
        openInterest: Math.floor(Math.random() * 20000) + 500,
        lastUpdated: new Date(),
      });

      contracts.push({
        id: `PUT-${ticker}-${strike}-${expiry.getTime()}-${id++}`,
        ticker,
        optionType: 'put',
        strike: Math.round(strike * 100) / 100,
        expiry,
        bid: Math.round(putBid * 100) / 100,
        ask: Math.round(putAsk * 100) / 100,
        premium: Math.round(putAsk * 100) / 100,
        dailyYield: Math.round(((putAsk / strike) / daysToExpiry) * 10000) / 100,
        annualizedReturn: Math.round(annualizedPutYield * 100) / 100,
        delta: Math.round(putDelta * 10000) / 10000,
        riskLevel: riskLevelMap(strike),
        volume: Math.floor(Math.random() * 5000) + 100,
        openInterest: Math.floor(Math.random() * 20000) + 500,
        lastUpdated: new Date(),
      });
    }
  }

  return contracts.sort((a, b) => {
    const expiryDiff = a.expiry.getTime() - b.expiry.getTime();
    if (expiryDiff !== 0) return expiryDiff;
    return a.strike - b.strike;
  });
}

export function getMockHoldingForTicker(ticker: string): Holding | undefined {
  const holdings = generateMockHoldings();
  return holdings.find((h) => h.ticker === ticker);
}

export function getMockHoldingsPortfolioValue(): number {
  return generateMockHoldings().reduce((sum, h) => sum + h.totalValue, 0);
}

export function getMockHoldingsTotalPnL(): number {
  return generateMockHoldings().reduce((sum, h) => sum + h.unrealizedPnL, 0);
}
