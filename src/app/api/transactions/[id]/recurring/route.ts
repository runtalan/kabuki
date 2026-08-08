import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { transactions, transactionRecurring } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import {
  getRecurringItems,
  getTransactionsForMerchant,
  estimateRecurrence,
  normalizeMerchant,
  matchesRecurringAmount,
} from '@/lib/spending-insights';
import { isoDay, parseDateInput, type Frequency } from '@/lib/recurring-shared';

const VALID_FREQUENCIES: Frequency[] = ['weekly', 'biweekly', 'monthly', 'yearly', 'custom'];

interface RecurringStatus {
  isRecurring: boolean;
  frequency: Frequency | null;
  intervalDays: number | null;
  nextDate: string | null;
  source: 'override' | 'detected' | null;
}

async function loadTransaction(id: string, householdUserIds: string[]) {
  const tx = await db.query.transactions.findFirst({
    where: eq(transactions.id, id),
    with: { account: { with: { plaidItem: true } } },
  });
  if (!tx || !householdUserIds.includes(tx.account.plaidItem.userId)) return null;
  return tx;
}

function resolveStatus(
  override: typeof transactionRecurring.$inferSelect | undefined,
  detected: { frequency: Frequency; nextDate: string } | null
): RecurringStatus {
  if (override?.dismissed) {
    // User explicitly said "not recurring" for this transaction — this
    // wins even if the merchant is still auto-detected as recurring, so
    // dismissing actually sticks instead of snapping back on.
    return { isRecurring: false, frequency: null, intervalDays: null, nextDate: null, source: 'override' };
  }
  if (override) {
    return {
      isRecurring: true,
      frequency: override.frequency as Frequency,
      intervalDays: override.intervalDays,
      nextDate: isoDay(override.nextDate),
      source: 'override',
    };
  }
  if (detected) {
    return {
      isRecurring: true,
      frequency: detected.frequency,
      intervalDays: null,
      nextDate: detected.nextDate,
      source: 'detected',
    };
  }
  return { isRecurring: false, frequency: null, intervalDays: null, nextDate: null, source: null };
}

// Merchant-level detection alone isn't enough to call a specific transaction
// "recurring" — a merchant can have both a real recurring charge (e.g.
// Chipotle $32/mo) and unrelated incidental purchases (a $17 lunch). Only
// treat this transaction as detected if its own amount actually fits the
// pattern the merchant was detected for.
async function findDetected(userId: string, merchantKey: string, txAmount: number) {
  const detected = await getRecurringItems(userId);
  const item = detected.find((i) => i.merchantKey === merchantKey);
  if (!item || !matchesRecurringAmount(txAmount, item)) return null;
  return item;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const tx = await loadTransaction(id, user.householdUserIds);
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    const merchantKey = normalizeMerchant(tx.merchant || tx.name);
    const [override, detectedItem] = await Promise.all([
      db.query.transactionRecurring.findFirst({ where: eq(transactionRecurring.transactionId, tx.id) }),
      findDetected(user.id, merchantKey, Number(tx.amount)),
    ]);

    return Response.json(resolveStatus(override, detectedItem));
  } catch (error) {
    console.error('Error fetching transaction recurring status:', error);
    return Response.json({ error: 'Failed to fetch recurring status' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const { id } = await params;
    const tx = await loadTransaction(id, user.householdUserIds);
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    const body = await request.json();
    const { action } = body;
    if (action !== 'confirm' && action !== 'dismiss' && action !== 'update') {
      return Response.json({ error: 'action must be "confirm", "dismiss", or "update"' }, { status: 400 });
    }

    const merchantKey = normalizeMerchant(tx.merchant || tx.name);
    const existing = await db.query.transactionRecurring.findFirst({
      where: eq(transactionRecurring.transactionId, tx.id),
    });

    if (action === 'dismiss') {
      // Persist an explicit "not recurring" override rather than deleting —
      // otherwise this snaps right back to 'detected' on the next GET
      // whenever the merchant is still auto-detected as recurring.
      if (existing) {
        await db
          .update(transactionRecurring)
          .set({ dismissed: true, updatedAt: new Date() })
          .where(eq(transactionRecurring.id, existing.id));
      } else {
        await db.insert(transactionRecurring).values({
          id: generateId(),
          transactionId: tx.id,
          userId: user.id,
          frequency: 'monthly',
          intervalDays: null,
          nextDate: new Date(),
          dismissed: true,
        });
      }
      return Response.json({
        isRecurring: false,
        frequency: null,
        intervalDays: null,
        nextDate: null,
        source: 'override',
      } satisfies RecurringStatus);
    }

    let frequency: Frequency;
    let intervalDays: number | null = null;
    let nextDate: Date;

    if (action === 'update') {
      if (!VALID_FREQUENCIES.includes(body.frequency)) {
        return Response.json({ error: 'Invalid frequency' }, { status: 400 });
      }
      frequency = body.frequency;
      if (frequency === 'custom') {
        if (!Number.isInteger(body.intervalDays) || body.intervalDays < 1) {
          return Response.json({ error: 'intervalDays must be a positive integer' }, { status: 400 });
        }
        intervalDays = body.intervalDays;
      }
      if (typeof body.nextDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.nextDate)) {
        return Response.json({ error: 'nextDate is required (yyyy-mm-dd)' }, { status: 400 });
      }
      nextDate = parseDateInput(body.nextDate);
    } else {
      // action === 'confirm': no explicit values — an existing, non-dismissed
      // override always wins as-is; otherwise (including re-confirming a
      // previously dismissed transaction) seed from detection, falling back
      // to an estimate against this merchant's history.
      if (existing && !existing.dismissed) {
        return Response.json(resolveStatus(existing, null));
      }
      const detectedItem = await findDetected(user.id, merchantKey, Number(tx.amount));
      if (detectedItem) {
        frequency = detectedItem.frequency;
        nextDate = parseDateInput(detectedItem.nextDate);
      } else {
        const matchingTxs = await getTransactionsForMerchant(user.id, merchantKey);
        const estimate = estimateRecurrence(matchingTxs);
        frequency = estimate.frequency;
        nextDate = estimate.nextDate;
      }
    }

    if (existing) {
      await db
        .update(transactionRecurring)
        .set({ frequency, intervalDays, nextDate, dismissed: false, updatedAt: new Date() })
        .where(eq(transactionRecurring.id, existing.id));
    } else {
      await db.insert(transactionRecurring).values({
        id: generateId(),
        transactionId: tx.id,
        userId: user.id,
        frequency,
        intervalDays,
        nextDate,
      });
    }

    return Response.json({
      isRecurring: true,
      frequency,
      intervalDays,
      nextDate: isoDay(nextDate),
      source: 'override',
    } satisfies RecurringStatus);
  } catch (error) {
    console.error('Error updating transaction recurring status:', error);
    return Response.json({ error: 'Failed to update recurring status' }, { status: 500 });
  }
}
