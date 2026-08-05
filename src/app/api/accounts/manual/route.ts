import { getUser } from '@/lib/auth';
import { db } from '@/db';
import { accounts, accountBalanceHistory } from '@/db/schema';
import { generateId } from '@/lib/id';
import { getOrCreateManualPlaidItem } from '@/lib/manual-accounts';

const VALID_OWNERS = ['renato', 'claudia', 'joint'];
const VALID_KINDS = ['asset', 'liability'];

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, kind, liabilityType, assetType, address, currentBalance, owner, icon } =
      await request.json();

    if (!name || typeof currentBalance !== 'number' || Number.isNaN(currentBalance)) {
      return Response.json({ error: 'Name and a numeric balance are required' }, { status: 400 });
    }

    const finalKind = VALID_KINDS.includes(kind) ? kind : 'liability';
    // Default to whoever's adding it rather than a generic "joint" label.
    const finalOwner = VALID_OWNERS.includes(owner) ? owner : user.email;

    const manualItem = await getOrCreateManualPlaidItem(user.id);
    const accountId = generateId();
    const balanceStr = currentBalance.toString();

    await db.insert(accounts).values({
      id: accountId,
      plaidItemId: manualItem.id,
      plaidAccountId: `manual-${accountId}`,
      name,
      icon: icon || null,
      owner: finalOwner,
      type: 'manual',
      subtype: finalKind === 'liability' ? liabilityType || 'other' : assetType || 'other',
      kind: finalKind,
      liabilityType: finalKind === 'liability' ? liabilityType || 'other' : null,
      assetType: finalKind === 'asset' ? assetType || 'other' : null,
      address: finalKind === 'asset' && assetType === 'property' ? address || null : null,
      isManual: true,
      currentBalance: balanceStr,
      currency: 'USD',
      isActive: true,
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(accountBalanceHistory).values({
      id: generateId(),
      accountId,
      balance: balanceStr,
      recordedAt: new Date(),
    });

    return Response.json({ id: accountId });
  } catch (error) {
    console.error('Error creating manual account:', error);
    return Response.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
