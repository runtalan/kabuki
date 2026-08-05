import { getUser } from '@/lib/auth';
import { db } from '@/db';
import { plaidItems, accounts } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await db.query.plaidItems.findMany({
      where: eq(plaidItems.userId, user.id),
    });

    const itemIds = items.map((i) => i.id);
    const itemAccounts = itemIds.length
      ? await db.query.accounts.findMany({
          where: inArray(accounts.plaidItemId, itemIds),
        })
      : [];

    const entries = items.map((item) => ({
      id: item.id,
      institution: item.institutionName || 'Unknown institution',
      status: item.syncStatus,
      lastSyncedAt: item.lastSyncedAt,
      error: item.lastError,
      accountCount: itemAccounts.filter((a) => a.plaidItemId === item.id).length,
      linkedAt: item.createdAt,
    }));

    return Response.json({
      entries,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching dev log:', error);
    return Response.json({ error: 'Failed to fetch dev log' }, { status: 500 });
  }
}
