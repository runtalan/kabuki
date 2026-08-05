import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { rules } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { applyRuleToExistingTransactions } from '@/lib/auto-tag';

export async function GET(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allRules = await db.query.rules.findMany({
      where: eq(rules.userId, user.id),
      orderBy: (rule, { desc }) => desc(rule.priority),
      with: {
        category: true,
      },
    });

    return Response.json({ rules: allRules });
  } catch (error) {
    console.error('Error fetching rules:', error);
    return Response.json(
      { error: 'Failed to fetch rules' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const { categoryId, merchantName, matchType, priority, retroactive } = await request.json();

    if (!categoryId || !merchantName) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await db
      .insert(rules)
      .values({
        id: generateId(),
        userId: user.id,
        categoryId,
        merchantName,
        matchType: matchType || 'contains',
        priority: priority || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Retroactively apply to existing transactions only when explicitly
    // requested — overrides smart guesses, never touches manually tagged
    // ones. Opt-in because retagging can silently touch a lot of history.
    const retagged = retroactive
      ? await applyRuleToExistingTransactions(user.id, {
          categoryId,
          merchantName,
          matchType: matchType || 'contains',
        })
      : 0;

    return Response.json({ ...result[0], retagged });
  } catch (error) {
    console.error('Error creating rule:', error);
    return Response.json(
      { error: 'Failed to create rule' },
      { status: 500 }
    );
  }
}
