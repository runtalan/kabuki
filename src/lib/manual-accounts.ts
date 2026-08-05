import { db } from '@/db';
import { plaidItems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from './id';

// Manual (non-Plaid) accounts still need a plaidItems row to hang off of —
// every account/transaction ownership check walks accounts -> plaidItem ->
// user. Rather than loosen that chain, each user gets one lazily-created
// synthetic "Manual Accounts" container (isManual: true, no real access
// token) that all their manually-added accounts attach to.
export async function getOrCreateManualPlaidItem(userId: string) {
  const existing = await db.query.plaidItems.findFirst({
    where: and(eq(plaidItems.userId, userId), eq(plaidItems.isManual, true)),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(plaidItems)
    .values({
      id: generateId(),
      userId,
      itemId: `manual-${userId}`,
      accessToken: 'manual',
      institutionName: 'Manual Accounts',
      isManual: true,
      syncStatus: 'idle',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return created;
}
