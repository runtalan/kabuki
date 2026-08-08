import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { transactions, recurringSeries } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import {
  getRecurringItems,
  getTransactionsForMerchant,
  estimateRecurrence,
  normalizeMerchant,
} from '@/lib/spending-insights';
import { isoDay } from '@/lib/recurring-shared';

interface RecurringStatus {
  isRecurring: boolean;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly' | null;
  nextDate: string | null;
}

async function loadTransaction(id: string, householdUserIds: string[]) {
  const tx = await db.query.transactions.findFirst({
    where: eq(transactions.id, id),
    with: { account: { with: { plaidItem: true } } },
  });
  if (!tx || !householdUserIds.includes(tx.account.plaidItem.userId)) return null;
  return tx;
}

async function findSeries(householdUserIds: string[], merchantKey: string) {
  return db.query.recurringSeries.findFirst({
    where: and(inArray(recurringSeries.userId, householdUserIds), eq(recurringSeries.merchantKey, merchantKey)),
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const tx = await loadTransaction(id, user.householdUserIds);
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    const merchantKey = normalizeMerchant(tx.merchant || tx.name);
    const [detected, series] = await Promise.all([
      getRecurringItems(user.id),
      findSeries(user.householdUserIds, merchantKey),
    ]);
    const detectedItem = detected.find((item) => item.merchantKey === merchantKey) || null;

    const isRecurring = series?.status === 'confirmed' || (!!detectedItem && series?.status !== 'dismissed');
    const frequency = isRecurring
      ? (series?.frequency as RecurringStatus['frequency']) || detectedItem?.frequency || null
      : null;
    const nextDate = isRecurring
      ? series?.nextDate
        ? isoDay(series.nextDate)
        : detectedItem?.nextDate || null
      : null;

    return Response.json({ isRecurring, frequency, nextDate } satisfies RecurringStatus);
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

    const { action } = await request.json();
    if (action !== 'confirm' && action !== 'dismiss') {
      return Response.json({ error: 'action must be "confirm" or "dismiss"' }, { status: 400 });
    }

    const merchantName = tx.merchant || tx.name;
    const merchantKey = normalizeMerchant(merchantName);
    if (merchantKey.length < 3) {
      return Response.json({ error: 'Merchant name is too short to track' }, { status: 400 });
    }

    const existingSeries = await findSeries(user.householdUserIds, merchantKey);

    if (action === 'dismiss') {
      if (existingSeries) {
        await db
          .update(recurringSeries)
          .set({ status: 'dismissed', updatedAt: new Date() })
          .where(eq(recurringSeries.id, existingSeries.id));
      } else {
        await db.insert(recurringSeries).values({
          id: generateId(),
          userId: user.id,
          merchantKey,
          merchantName,
          status: 'dismissed',
          isManual: false,
        });
      }
      return Response.json({ isRecurring: false, frequency: null, nextDate: null } satisfies RecurringStatus);
    }

    // action === 'confirm'
    const detected = await getRecurringItems(user.id);
    const detectedItem = detected.find((item) => item.merchantKey === merchantKey) || null;

    if (detectedItem) {
      if (existingSeries) {
        await db
          .update(recurringSeries)
          .set({ status: 'confirmed', isManual: false, updatedAt: new Date() })
          .where(eq(recurringSeries.id, existingSeries.id));
      } else {
        await db.insert(recurringSeries).values({
          id: generateId(),
          userId: user.id,
          merchantKey,
          merchantName,
          status: 'confirmed',
          isManual: false,
        });
      }
      return Response.json({
        isRecurring: true,
        frequency: detectedItem.frequency,
        nextDate: detectedItem.nextDate,
      } satisfies RecurringStatus);
    }

    const matchingTxs = await getTransactionsForMerchant(user.id, merchantKey);
    const estimate = estimateRecurrence(matchingTxs);
    const values = {
      merchantKey,
      merchantName,
      status: 'confirmed' as const,
      isManual: true,
      frequency: estimate.frequency,
      amount: estimate.amount.toString(),
      categoryId: estimate.categoryId,
      nextDate: estimate.nextDate,
      isIncome: estimate.isIncome,
    };

    if (existingSeries) {
      await db
        .update(recurringSeries)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(recurringSeries.id, existingSeries.id));
    } else {
      await db.insert(recurringSeries).values({ id: generateId(), userId: user.id, ...values });
    }

    return Response.json({
      isRecurring: true,
      frequency: estimate.frequency,
      nextDate: isoDay(estimate.nextDate),
    } satisfies RecurringStatus);
  } catch (error) {
    console.error('Error updating transaction recurring status:', error);
    return Response.json({ error: 'Failed to update recurring status' }, { status: 500 });
  }
}
