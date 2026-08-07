import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { rules } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const { ruleIds } = await request.json();

    if (!Array.isArray(ruleIds)) {
      return Response.json(
        { error: 'ruleIds must be an array' },
        { status: 400 }
      );
    }

    // Update priorities: highest index (top of list) gets highest priority
    const updates = ruleIds.map((id: string, index: number) => ({
      id,
      priority: ruleIds.length - index,
    }));

    // Update all rules in a single transaction
    for (const update of updates) {
      await db
        .update(rules)
        .set({
          priority: update.priority,
          updatedAt: new Date(),
        })
        .where(and(eq(rules.id, update.id), eq(rules.userId, user.id)));
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error reordering rules:', error);
    return Response.json(
      { error: 'Failed to reorder rules' },
      { status: 500 }
    );
  }
}
