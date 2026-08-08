import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';

const VALID_CATEGORY_SOURCES = ['manual', 'rule', 'smart'];

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const { transactionId, categoryId, categorySource } = await request.json();

    if (!transactionId) {
      return Response.json({ error: 'Missing transactionId' }, { status: 400 });
    }

    const existing = await db.query.transactions.findFirst({
      where: eq(transactions.id, transactionId),
      with: { account: { with: { plaidItem: true } } },
    });

    if (!existing || !user.householdUserIds.includes(existing.account.plaidItem.userId)) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const result = await db
      .update(transactions)
      .set({
        categoryId: categoryId || null,
        categorySource: categoryId
          ? VALID_CATEGORY_SOURCES.includes(categorySource) ? categorySource : 'manual'
          : null,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId))
      .returning();

    if (result.length === 0) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return Response.json(result[0]);
  } catch (error) {
    console.error('Error updating transaction:', error);
    return Response.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}
