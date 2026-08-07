import { db } from '@/db';
import { trades } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export interface TradeRecord {
  id: string;
  accountId: string;
  symbol: string;
  quantity: number;
  executionPrice: number;
  orderType: string;
  side: string;
  status: string;
  createdAt: Date;
}

export async function getTradeHistory(accountId: string): Promise<TradeRecord[]> {
  const rows = await db.query.trades.findMany({
    where: eq(trades.accountId, accountId),
    orderBy: (t) => desc(t.createdAt),
  });
  return rows.map((row) => ({
    id: row.id,
    accountId: row.accountId,
    symbol: row.symbol,
    quantity: Number(row.quantity),
    executionPrice: Number(row.executionPrice),
    orderType: row.orderType,
    side: row.side,
    status: row.status,
    createdAt: row.createdAt,
  }));
}

export async function createTrade(data: {
  id: string;
  accountId: string;
  symbol: string;
  quantity: number;
  executionPrice: number;
  orderType: string;
  side: string;
}) {
  await db.insert(trades).values(data);
}
