import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { accounts } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, id),
      with: { plaidItem: true },
    });

    if (!account || account.plaidItem.userId !== user.id) {
      return Response.json({ error: 'Account not found' }, { status: 404 });
    }

    if (!account.isManual) {
      return Response.json(
        { error: 'Only manually-added accounts can be deleted individually' },
        { status: 400 }
      );
    }

    await db.delete(accounts).where(eq(accounts.id, id));

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting manual account:', error);
    return Response.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
