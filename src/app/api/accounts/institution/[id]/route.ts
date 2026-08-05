import { getUser } from '@/lib/auth';
import { db } from '@/db';
import { plaidItems } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Renames the parent institution/connection (e.g. mislabeled "Bank Account"
// → "Chase") that groups a set of sub-accounts together.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { institutionName } = await request.json();

    if (!institutionName || !institutionName.trim()) {
      return Response.json({ error: 'Name is required' }, { status: 400 });
    }

    const existing = await db.query.plaidItems.findFirst({
      where: eq(plaidItems.id, id),
    });

    if (!existing || existing.userId !== user.id) {
      return Response.json({ error: 'Connection not found' }, { status: 404 });
    }

    const result = await db
      .update(plaidItems)
      .set({ institutionName: institutionName.trim(), updatedAt: new Date() })
      .where(eq(plaidItems.id, id))
      .returning();

    return Response.json(result[0]);
  } catch (error) {
    console.error('Error renaming institution:', error);
    return Response.json({ error: 'Failed to rename connection' }, { status: 500 });
  }
}
