'use server';

import { getUser } from '@/lib/auth';
import { generateId } from '@/lib/id';
import { createTrade } from '@/lib/trades';
import { getUserAccounts } from '@/lib/queries';
import { db } from '@/db';
import { holdings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function executeTrade(
  symbol: string,
  quantity: number,
  executionPrice: number,
  orderType: 'market' | 'limit',
  side: 'buy' | 'sell'
) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  // For now, assume user has a default brokerage account
  // In production, you'd select the account from a dropdown
  // Note: accounts don't carry a userId directly — they belong to a
  // plaid_items row, which is what's scoped to the user (see
  // src/lib/queries.ts getUserAccounts()).
  const userAccounts = await getUserAccounts(user.id);

  const brokerageAccount = userAccounts.find((acc) => acc.type === 'brokerage');
  if (!brokerageAccount) throw new Error('No brokerage account found');

  // Create trade record
  const tradeId = generateId();
  await createTrade({
    id: tradeId,
    accountId: brokerageAccount.id,
    symbol,
    quantity,
    executionPrice,
    orderType,
    side,
  });

  // Update holdings
  const existingHolding = await db.query.holdings.findFirst({
    where: and(
      eq(holdings.accountId, brokerageAccount.id),
      eq(holdings.symbol, symbol)
    ),
  });

  if (side === 'buy') {
    if (existingHolding) {
      // Update existing position
      const newShares = Number(existingHolding.shares) + quantity;
      const totalCost =
        Number(existingHolding.costBasis) + quantity * executionPrice;
      const newCostBasis = totalCost / newShares;

      await db
        .update(holdings)
        .set({
          shares: String(newShares),
          costBasis: String(newCostBasis),
          updatedAt: new Date(),
        })
        .where(eq(holdings.id, existingHolding.id));
    } else {
      // Create new holding
      await db.insert(holdings).values({
        id: generateId(),
        accountId: brokerageAccount.id,
        symbol,
        name: symbol, // TODO: fetch from Yahoo Finance
        assetClass: 'us_stock', // TODO: determine from symbol
        shares: String(quantity),
        costBasis: String(executionPrice),
        currentPrice: String(executionPrice),
      });
    }
  } else if (side === 'sell') {
    if (existingHolding) {
      const newShares = Number(existingHolding.shares) - quantity;
      if (newShares <= 0) {
        // Remove holding entirely
        await db.delete(holdings).where(eq(holdings.id, existingHolding.id));
      } else {
        // Update position
        await db
          .update(holdings)
          .set({
            shares: String(newShares),
            updatedAt: new Date(),
          })
          .where(eq(holdings.id, existingHolding.id));
      }
    }
  }

  return { tradeId, success: true };
}
