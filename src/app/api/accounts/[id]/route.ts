import { getUser } from '@/lib/auth';
import { db } from '@/db';
import { accounts } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, id),
      with: { plaidItem: true },
    });

    if (!account || !user.householdUserIds.includes(account.plaidItem.userId)) {
      return Response.json({ error: 'Account not found' }, { status: 404 });
    }

    return Response.json({ account });
  } catch (error) {
    console.error('Error fetching account:', error);
    return Response.json({ error: 'Failed to fetch account' }, { status: 500 });
  }
}
