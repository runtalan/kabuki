import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { recurringSeries } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { generateId } from '@/lib/id';

const VALID_STATUSES = ['confirmed', 'dismissed'];

// Answers the "is this recurring?" prompt for a detected series. Upserts on
// (userId, merchantKey) so answering twice just flips the existing decision.
export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const { merchantKey, merchantName, status } = await request.json();

    if (!merchantKey || !merchantName) {
      return Response.json({ error: 'merchantKey and merchantName are required' }, { status: 400 });
    }
    if (!VALID_STATUSES.includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    }

    const existing = await db.query.recurringSeries.findFirst({
      where: and(
        inArray(recurringSeries.userId, user.householdUserIds),
        eq(recurringSeries.merchantKey, merchantKey)
      ),
    });

    if (existing) {
      const [row] = await db
        .update(recurringSeries)
        .set({ status, updatedAt: new Date() })
        .where(eq(recurringSeries.id, existing.id))
        .returning();
      return Response.json(row);
    }

    const [row] = await db
      .insert(recurringSeries)
      .values({
        id: generateId(),
        userId: user.id,
        merchantKey,
        merchantName,
        status,
        isManual: false,
      })
      .returning();

    return Response.json(row, { status: 201 });
  } catch (error) {
    console.error('Error reviewing recurring series:', error);
    return Response.json({ error: 'Failed to review recurring series' }, { status: 500 });
  }
}
