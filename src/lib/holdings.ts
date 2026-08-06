import { db } from '@/db';
import { holdings } from '@/db/schema';

export interface HoldingWithValue {
  id: string;
  accountId: string;
  symbol: string;
  name: string;
  assetClass: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPct: number;
}

export async function getAllHoldings(): Promise<HoldingWithValue[]> {
  const rows = await db.query.holdings.findMany();
  return rows.map((row) => {
    const shares = Number(row.shares);
    const costBasis = Number(row.costBasis);
    const currentPrice = Number(row.currentPrice);
    const currentValue = shares * currentPrice;
    const gainLoss = currentValue - costBasis;
    return {
      id: row.id,
      accountId: row.accountId,
      symbol: row.symbol,
      name: row.name,
      assetClass: row.assetClass,
      shares,
      costBasis,
      currentPrice,
      currentValue,
      gainLoss,
      gainLossPct: costBasis > 0 ? (gainLoss / costBasis) * 100 : 0,
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
