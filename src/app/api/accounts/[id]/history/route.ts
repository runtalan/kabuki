import { getUser } from '@/lib/auth';
import { db } from '@/db';
import { accounts, accountBalanceHistory } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, id),
      with: { plaidItem: true },
    });

    if (!account || account.plaidItem.userId !== user.id) {
      return Response.json({ error: 'Account not found' }, { status: 404 });
    }

    const history = await db.query.accountBalanceHistory.findMany({
      where: eq(accountBalanceHistory.accountId, id),
      orderBy: (row, { asc }) => asc(row.recordedAt),
    });

    return Response.json({
      account: {
        id: account.id,
        name: account.displayName || account.name,
        kind: account.kind,
      },
      history,
    });
  } catch (error) {
    console.error('Error fetching balance history:', error);
    return Response.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
