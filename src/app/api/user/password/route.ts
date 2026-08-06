import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// Change the logged-in user's own password. Requires the current password —
// this is a shared-household login (see AGENTS.md / ENVIRONMENTS.md), not a
// public signup, so there's no email-reset flow; verifying the current
// password is the only guard against someone at an unlocked session
// silently taking over the account.
export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const { currentPassword, newPassword } = await request.json();

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return Response.json({ error: 'Current and new password are required' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return Response.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const dbUser = await db.query.users.findFirst({ where: eq(users.id, user.id) });
    if (!dbUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!isValid) {
      return Response.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, dbUser.id));

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    return Response.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
