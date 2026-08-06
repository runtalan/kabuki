import { getUser } from '@/lib/auth';
import { db } from '@/db';
import { apiRequestLogs, integrationTokens, transactions } from '@/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';

const PROVIDER = 'apple_card';
const LOG_LIMIT = 50;
const TRANSACTION_LIMIT = 50;

// Dev/debug view for the Apple Card Sync endpoint — every request that's
// hit /api/v1/apple-card (success or failure, headers included), plus the
// most recent transactions it actually created, so mis-shaped payloads and
// their resulting junk transactions can both be inspected and cleaned up
// from Settings while the Shortcut config gets dialed in.
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logs = await db.query.apiRequestLogs.findMany({
      where: eq(apiRequestLogs.provider, PROVIDER),
      orderBy: [desc(apiRequestLogs.createdAt)],
      limit: LOG_LIMIT,
    });

    const integrations = await db.query.integrationTokens.findMany({
      where: eq(integrationTokens.provider, PROVIDER),
      with: { user: true },
    });
    const accountOwner = new Map<string, string>();
    for (const integration of integrations) {
      if (integration.accountId && integration.user) {
        accountOwner.set(integration.accountId, integration.user.username);
      }
    }
    const accountIds = [...accountOwner.keys()];

    const recentTransactions = accountIds.length
      ? await db.query.transactions.findMany({
          where: inArray(transactions.accountId, accountIds),
          orderBy: [desc(transactions.createdAt)],
          limit: TRANSACTION_LIMIT,
        })
      : [];

    return Response.json({
      logs: logs.map((log) => ({
        id: log.id,
        method: log.method,
        owner: log.owner,
        statusCode: log.statusCode,
        headers: JSON.parse(log.headers),
        queryParams: log.queryParams ? JSON.parse(log.queryParams) : null,
        body: log.body,
        parsed: log.parsed ? JSON.parse(log.parsed) : null,
        error: log.error,
        transactionId: log.transactionId,
        createdAt: log.createdAt,
      })),
      transactions: recentTransactions.map((tx) => ({
        id: tx.id,
        name: tx.name,
        merchant: tx.merchant,
        amount: tx.amount,
        type: tx.type,
        date: tx.date,
        notes: tx.notes,
        owner: accountOwner.get(tx.accountId) ?? null,
        createdAt: tx.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching Apple Card debug log:', error);
    return Response.json({ error: 'Failed to load debug log' }, { status: 500 });
  }
}
