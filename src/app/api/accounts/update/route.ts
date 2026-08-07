import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { accounts, accountBalanceHistory } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/lib/id';

const validOwners = ['renato', 'claudia', 'joint'];

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const { accountId, displayName, icon, owner, currentBalance } = await request.json();

    if (!accountId) {
      return Response.json({ error: 'Missing accountId' }, { status: 400 });
    }

    const existing = await db.query.accounts.findFirst({
      where: eq(accounts.id, accountId),
      with: { plaidItem: true },
    });

    if (!existing || !user.householdUserIds.includes(existing.plaidItem.userId)) {
      return Response.json({ error: 'Account not found' }, { status: 404 });
    }

    // Balance is only user-editable on manual accounts — Plaid-linked
    // balances are owned by the sync, not the form.
    const balanceChanged =
      existing.isManual &&
      typeof currentBalance === 'number' &&
      !Number.isNaN(currentBalance) &&
      currentBalance.toString() !== existing.currentBalance;

    const result = await db
      .update(accounts)
      .set({
        displayName: displayName || null,
        icon: icon || null,
        ...(owner && validOwners.includes(owner) ? { owner } : {}),
        ...(balanceChanged ? { currentBalance: currentBalance.toString() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, accountId))
      .returning();

    if (balanceChanged) {
      await db.insert(accountBalanceHistory).values({
        id: generateId(),
        accountId,
        balance: currentBalance.toString(),
        recordedAt: new Date(),
      });
    }

    return Response.json(result[0]);
  } catch (error) {
    console.error('Error updating account:', error);
    return Response.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}
