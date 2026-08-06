import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { integrationTokens, transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';

const PROVIDER = 'apple_card';

// Debug-only delete: removes a transaction that came in through Apple Card
// Sync. Deliberately checks membership against *either* owner's Apple Card
// account (not "does this belong to the logged-in session user", like the
// generic transaction DELETE would) — same cross-owner model as token
// generation, since either person should be able to clean up junk test
// transactions created while dialing in the Shortcut, regardless of who's
// logged in.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const { id } = await params;

    const appleCardAccounts = await db.query.integrationTokens.findMany({
      where: eq(integrationTokens.provider, PROVIDER),
    });
    const accountIds = appleCardAccounts.map((i) => i.accountId).filter((v): v is string => !!v);

    const existing = await db.query.transactions.findFirst({ where: eq(transactions.id, id) });
    if (!existing || !accountIds.includes(existing.accountId)) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    await db.delete(transactions).where(eq(transactions.id, id));

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Error deleting Apple Card transaction:', error);
    return Response.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}
