import { db } from '@/db';
import { holdings, optionHoldings } from '@/db/schema';
import { getRealtimeQuotes } from './yahoo-finance';

export interface HoldingWithValue {
  id: number;
  symbol: string;
  name: string;
  assetClass: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPct: number;
  acquisitionDate: Date;
}

export async function getAllHoldings(): Promise<HoldingWithValue[]> {
  const rows = await db.query.holdings.findMany();

  // Fetch live quotes for all symbols
  const symbols = Array.from(new Set(rows.map((r) => r.symbol)));
  const quotes = symbols.length ? await getRealtimeQuotes(symbols) : [];
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

  return rows.map((row) => {
    const shares = Number(row.quantity);
    const costBasis = Number(row.costBasis);
    const quote = quoteMap.get(row.symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice ?? 0;
    const currentValue = shares * currentPrice;
    const gainLoss = currentValue - costBasis;
    return {
      id: row.id,
      symbol: row.symbol,
      name: quote?.shortName || row.symbol,
      assetClass: row.assetType,
      shares,
      costBasis,
      currentPrice,
      currentValue,
      gainLoss,
      gainLossPct: costBasis > 0 ? (gainLoss / costBasis) * 100 : 0,
      acquisitionDate: row.acquiredAt,
    };
  });
}

export async function getAllOptionHoldings(): Promise<HoldingWithValue[]> {
  const rows = await db.query.optionHoldings.findMany();
  return rows.map((row) => {
    const contracts = Number(row.contracts);
    const costBasis = Number(row.costBasis);
    // No live options pricing yet — use the average premium paid as a stand-in
    // for current price so P&L reads as flat ($0) until a real quote source
    // for option contracts is wired up.
    const currentPrice = Number(row.averagePremium);
    const currentValue = contracts * currentPrice * 100; // 100 shares per contract
    const gainLoss = currentValue - costBasis;
    return {
      id: row.id as unknown as number,
      symbol: row.underlyingSymbol,
      name: `${row.underlyingSymbol} ${row.optionType?.toUpperCase()} $${Number(row.strikePrice)} ${new Date(
        row.expirationDate
      ).toLocaleDateString()}`,
      assetClass: 'option',
      shares: contracts,
      costBasis,
      currentPrice,
      currentValue,
      gainLoss,
      gainLossPct: costBasis > 0 ? (gainLoss / costBasis) * 100 : 0,
      acquisitionDate: row.createdAt,
    };
  });
}

export interface AllocationSlice {
  assetClass: string;
  value: number;
  pct: number;
}

export async function getAllocation(): Promise<AllocationSlice[]> {
  const allHoldings = await getAllHoldings();
  const total = allHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  const byClass = new Map<string, number>();
  for (const h of allHoldings) {
    byClass.set(h.assetClass, (byClass.get(h.assetClass) ?? 0) + h.currentValue);
  }
  return Array.from(byClass.entries()).map(([assetClass, value]) => ({
    assetClass,
    value,
    pct: total > 0 ? (value / total) * 100 : 0,
  }));
}
