import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { integrationTokens, accounts, users } from '@/db/schema';
import { eq, and, asc, inArray, count } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { generateToken, hashToken } from '@/lib/integration-tokens';
import { getOrCreateManualPlaidItem } from '@/lib/manual-accounts';

const PROVIDER = 'apple_card';

// Hard cap on this table regardless of how many owners/providers it grows
// to cover later — evicts the oldest rows first, keeping the newest under
// the limit, before every insert.
const MAX_STORED_TOKENS = 10;

async function pruneOldTokens() {
  const [{ value: total }] = await db.select({ value: count() }).from(integrationTokens);
  if (total < MAX_STORED_TOKENS) return;
  const excess = total - MAX_STORED_TOKENS + 1; // make room for the row about to be inserted
  const oldest = await db
    .select({ id: integrationTokens.id })
    .from(integrationTokens)
    .orderBy(asc(integrationTokens.createdAt))
    .limit(excess);
  if (oldest.length) {
    await db.delete(integrationTokens).where(
      inArray(integrationTokens.id, oldest.map((r) => r.id))
    );
  }
}

// Status for all individual household members (Apple Card is per-individual, not joint).
// The plaintext token itself is never retrievable after creation, only whether one exists
// and when it was last used.
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const owners = user.household.usernames.filter(u => u !== 'joint');
    const ownerUsers = await db.query.users.findMany({
      where: inArray(users.username, owners),
    });

    const results = await Promise.all(
      ownerUsers.map(async (owner) => {
        const existing = await db.query.integrationTokens.findFirst({
          where: and(eq(integrationTokens.userId, owner.id), eq(integrationTokens.provider, PROVIDER)),
          with: { account: true },
        });
        return {
          owner: owner.username,
          configured: !!existing,
          lastUsedAt: existing?.lastUsedAt ?? null,
          accountName: existing?.account?.displayName || existing?.account?.name || null,
        };
      })
    );

    return Response.json({ integrations: results });
  } catch (error) {
    console.error('Error fetching Apple Card integration status:', error);
    return Response.json({ error: 'Failed to load integration status' }, { status: 500 });
  }
}

// Generates (or rotates) the token for the selected owner (chosen via the `owner` field,
// independent of who's logged in). Apple Card is per-individual, not joint. Rotating
// immediately invalidates whatever Shortcut was using the old one — there's only ever
// one live token per owner.
export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const owners = user.household.usernames.filter(u => u !== 'joint');
    const { owner } = await request.json().catch(() => ({}));
    if (!owners.includes(owner)) {
      return Response.json({ error: `owner must be one of: ${owners.join(', ')}` }, { status: 400 });
    }

    const ownerUser = await db.query.users.findFirst({ where: eq(users.username, owner) });
    if (!ownerUser) {
      return Response.json({ error: `No account found for ${owner}` }, { status: 404 });
    }

    const existing = await db.query.integrationTokens.findFirst({
      where: and(eq(integrationTokens.userId, ownerUser.id), eq(integrationTokens.provider, PROVIDER)),
    });

    // Reuse the same manual "Apple Card" account across rotations — only
    // the token changes, so past synced transactions stay attached to it.
    let accountId = existing?.accountId ?? null;
    if (!accountId) {
      const manualItem = await getOrCreateManualPlaidItem(ownerUser.id);
      const newAccountId = generateId();
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
        resetBalanceMonthly: true,
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
      await pruneOldTokens();
      await db.insert(integrationTokens).values({
        id: generateId(),
        userId: ownerUser.id,
        provider: PROVIDER,
        tokenHash,
        accountId,
        createdAt: new Date(),
      });
    }

    // Cloud Run's container listens on :8080 internally — `request.url`'s
    // origin can reflect that internal port depending on how the request
    // reached this route, which would hand back an endpoint the Shortcut
    // can't actually reach. Production always has one real public origin,
    // so hard-code it there instead of deriving it; local dev still derives
    // from the request so `localhost:3000` etc. keeps working.
    const origin =
      process.env.NODE_ENV === 'production' ? 'https://mybuttons.casa' : new URL(request.url).origin;
    return Response.json({ owner, token, endpoint: `${origin}/api/v1/apple-card?token=${token}` });
  } catch (error) {
    console.error('Error generating Apple Card token:', error);
    return Response.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const owners = user.household.usernames.filter(u => u !== 'joint');
    const owner = new URL(request.url).searchParams.get('owner');
    if (!owner || !owners.includes(owner)) {
      return Response.json({ error: `owner must be one of: ${owners.join(', ')}` }, { status: 400 });
    }

    const ownerUser = await db.query.users.findFirst({ where: eq(users.username, owner as string) });
    if (!ownerUser) {
      return Response.json({ error: `No account found for ${owner}` }, { status: 404 });
    }

    await db
      .delete(integrationTokens)
      .where(and(eq(integrationTokens.userId, ownerUser.id), eq(integrationTokens.provider, PROVIDER)));

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Error revoking Apple Card token:', error);
    return Response.json({ error: 'Failed to revoke token' }, { status: 500 });
  }
}
