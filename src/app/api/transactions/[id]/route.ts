import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { transactions, transactionTags } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/lib/id';

const VALID_OWNERS = ['renato', 'claudia', 'joint'];
const VALID_TRANSFER_TYPES = ['transfer', 'credit_card_payment'];

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
    const tx = await db.query.transactions.findFirst({
      where: eq(transactions.id, id),
      with: {
        category: true,
        account: { with: { plaidItem: true } },
        tags: { with: { tag: true } },
      },
    });

    if (!tx || tx.account.plaidItem.userId !== user.id) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return Response.json({
      ...tx,
      tags: tx.tags.map((t) => t.tag),
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return Response.json({ error: 'Failed to fetch transaction' }, { status: 500 });
  }
}

// Full transaction edit: merchant/description, amount, date, category,
// per-transaction owner override, and tags — everything the edit modal exposes.
export async function PATCH(
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

    const existing = await db.query.transactions.findFirst({
      where: eq(transactions.id, id),
      with: { account: { with: { plaidItem: true } } },
    });

    if (!existing || existing.account.plaidItem.userId !== user.id) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, amount, type, date, categoryId, ownerOverride, tagIds, hidden, transferType, notes } =
      body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (notes !== undefined) updates.notes = typeof notes === 'string' && notes.trim() ? notes.trim() : null;
    if (date) updates.date = new Date(date);
    if (categoryId !== undefined) {
      updates.categoryId = categoryId || null;
      updates.categorySource = categoryId ? 'manual' : null;
    }
    if (ownerOverride !== undefined) {
      updates.ownerOverride =
        ownerOverride && VALID_OWNERS.includes(ownerOverride) ? ownerOverride : null;
    }
    if (typeof amount === 'number' && !Number.isNaN(amount) && (type === 'debit' || type === 'credit')) {
      const magnitude = Math.abs(amount);
      updates.amount = (type === 'debit' ? -magnitude : magnitude).toString();
      updates.type = type;
    }
    if (typeof hidden === 'boolean') updates.hidden = hidden;
    if (transferType !== undefined) {
      updates.transferType =
        transferType && VALID_TRANSFER_TYPES.includes(transferType) ? transferType : null;
    }

    const result = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();

    if (Array.isArray(tagIds)) {
      await db.delete(transactionTags).where(eq(transactionTags.transactionId, id));
      if (tagIds.length > 0) {
        await db.insert(transactionTags).values(
          tagIds.map((tagId: string) => ({ transactionId: id, tagId }))
        );
      }
    }

    return Response.json(result[0]);
  } catch (error) {
    console.error('Error updating transaction:', error);
    return Response.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}
