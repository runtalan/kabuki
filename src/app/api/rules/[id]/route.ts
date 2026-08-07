import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { rules } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export async function PUT(
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
    const { categoryId, merchantName, matchType, priority, enabled } =
      await request.json();

    const result = await db
      .update(rules)
      .set({
        categoryId: categoryId || undefined,
        merchantName: merchantName || undefined,
        matchType: matchType || undefined,
        priority: priority !== undefined ? priority : undefined,
        enabled: enabled !== undefined ? enabled : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(rules.id, id), inArray(rules.userId, user.householdUserIds)))
      .returning();

    if (result.length === 0) {
      return Response.json({ error: 'Rule not found' }, { status: 404 });
    }

    return Response.json(result[0]);
  } catch (error) {
    console.error('Error updating rule:', error);
    return Response.json(
      { error: 'Failed to update rule' },
      { status: 500 }
    );
  }
}

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
    const result = await db
      .delete(rules)
      .where(and(eq(rules.id, id), inArray(rules.userId, user.householdUserIds)))
      .returning();

    if (result.length === 0) {
      return Response.json({ error: 'Rule not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting rule:', error);
    return Response.json(
      { error: 'Failed to delete rule' },
      { status: 500 }
    );
  }
}
