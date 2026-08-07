import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { recurringSeries } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { parseDateInput } from '@/lib/recurring-shared';

const VALID_FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'yearly'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const { id } = await params;
    const existing = await db.query.recurringSeries.findFirst({
      where: and(eq(recurringSeries.id, id), inArray(recurringSeries.userId, user.householdUserIds)),
    });
    if (!existing) {
      return Response.json({ error: 'Recurring series not found' }, { status: 404 });
    }

    const body = await request.json();
    const { merchantName, frequency, amount, categoryId, nextDate, isIncome, status } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof merchantName === 'string' && merchantName.trim()) {
      updates.merchantName = merchantName.trim();
    }
    if (frequency !== undefined) {
      if (!VALID_FREQUENCIES.includes(frequency)) {
        return Response.json({ error: 'Invalid frequency' }, { status: 400 });
      }
      updates.frequency = frequency;
    }
    if (amount !== undefined) {
      const parsed = Number(amount);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return Response.json({ error: 'Amount must be greater than zero' }, { status: 400 });
      }
      updates.amount = parsed.toString();
    }
    if (categoryId !== undefined) updates.categoryId = categoryId || null;
    if (nextDate !== undefined) updates.nextDate = nextDate ? parseDateInput(nextDate) : null;
    if (typeof isIncome === 'boolean') updates.isIncome = isIncome;
    if (status === 'confirmed' || status === 'dismissed') updates.status = status;

    const [row] = await db
      .update(recurringSeries)
      .set(updates)
      .where(eq(recurringSeries.id, id))
      .returning();

    return Response.json(row);
  } catch (error) {
    console.error('Error updating recurring series:', error);
    return Response.json({ error: 'Failed to update recurring series' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const { id } = await params;
    const existing = await db.query.recurringSeries.findFirst({
      where: and(eq(recurringSeries.id, id), inArray(recurringSeries.userId, user.householdUserIds)),
    });
    if (!existing) {
      return Response.json({ error: 'Recurring series not found' }, { status: 404 });
    }

    if (existing.isManual) {
      // Nothing detects manual entries, so removing the row removes the series.
      await db.delete(recurringSeries).where(eq(recurringSeries.id, id));
    } else {
      // Detection would just resurface it — mark it dismissed instead.
      await db
        .update(recurringSeries)
        .set({ status: 'dismissed', updatedAt: new Date() })
        .where(eq(recurringSeries.id, id));
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting recurring series:', error);
    return Response.json({ error: 'Failed to delete recurring series' }, { status: 500 });
  }
}
