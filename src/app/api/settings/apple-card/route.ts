import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { integrationTokens, accounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { generateToken, hashToken } from '@/lib/integration-tokens';
import { getOrCreateManualPlaidItem } from '@/lib/manual-accounts';

const PROVIDER = 'apple_card';
const VALID_OWNERS = ['renato', 'claudia', 'joint'];

// Status only — the plaintext token itself is never retrievable after
// creation, only whether one exists and when it was last used.
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await db.query.integrationTokens.findFirst({
      where: and(eq(integrationTokens.userId, user.id), eq(integrationTokens.provider, PROVIDER)),
      with: { account: true },
    });

    return Response.json({
      configured: !!existing,
      lastUsedAt: existing?.lastUsedAt ?? null,
      accountName: existing?.account?.displayName || existing?.account?.name || null,
    });
  } catch (error) {
    console.error('Error fetching Apple Card integration status:', error);
    return Response.json({ error: 'Failed to load integration status' }, { status: 500 });
  }
}

// Generates (or rotates) the token. Rotating immediately invalidates
// whatever Shortcut was using the old one — there's only ever one live
// token per user per provider.
export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const existing = await db.query.integrationTokens.findFirst({
      where: and(eq(integrationTokens.userId, user.id), eq(integrationTokens.provider, PROVIDER)),
    });

    // Reuse the same manual "Apple Card" account across rotations — only
    // the token changes, so past synced transactions stay attached to it.
    let accountId = existing?.accountId ?? null;
    if (!accountId) {
      const manualItem = await getOrCreateManualPlaidItem(user.id);
      const newAccountId = generateId();
      const owner = VALID_OWNERS.includes(user.email) ? user.email : 'joint';
      await db.insert(accounts).values({
        id: newAccountId,
        plaidItemId: manualItem.id,
        plaidAccountId: `manual-${newAccountId}`,
        name: 'Apple Card',
        icon: 'CreditCard',
        owner,
        type: 'manual',
        subtype: 'credit card',
        kind: 'liability',
        liabilityType: 'credit_card',
        isManual: true,
        currentBalance: '0',
        currency: 'USD',
        isActive: true,
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      accountId = newAccountId;
    }

    const token = generateToken();
    const tokenHash = hashToken(token);

    if (existing) {
      await db
        .update(integrationTokens)
        .set({ tokenHash, accountId, lastUsedAt: null })
        .where(eq(integrationTokens.id, existing.id));
    } else {
      await db.insert(integrationTokens).values({
        id: generateId(),
        userId: user.id,
        provider: PROVIDER,
        tokenHash,
        accountId,
        createdAt: new Date(),
      });
    }

    const origin = new URL(request.url).origin;
    return Response.json({ token, endpoint: `${origin}/api/v1/apple-card?token=${token}` });
  } catch (error) {
    console.error('Error generating Apple Card token:', error);
    return Response.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    await db
      .delete(integrationTokens)
      .where(and(eq(integrationTokens.userId, user.id), eq(integrationTokens.provider, PROVIDER)));

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Error revoking Apple Card token:', error);
    return Response.json({ error: 'Failed to revoke token' }, { status: 500 });
  }
}
