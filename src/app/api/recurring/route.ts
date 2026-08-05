import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { recurringSeries } from '@/db/schema';
import { generateId } from '@/lib/id';
import { getRecurringEntries, normalizeMerchant } from '@/lib/recurring';
import { parseDateInput } from '@/lib/recurring-shared';

const VALID_FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'yearly'];

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const entries = await getRecurringEntries(user.id);
    return Response.json({ entries });
  } catch (error) {
    console.error('Error fetching recurring entries:', error);
    return Response.json({ error: 'Failed to fetch recurring entries' }, { status: 500 });
  }
}

// Create a manual recurring series (the "+ Add" flow).
export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const body = await request.json();
    const { merchantName, frequency, amount, categoryId, nextDate, isIncome } = body;

    if (!merchantName?.trim()) {
      return Response.json({ error: 'Merchant name is required' }, { status: 400 });
    }
    if (!VALID_FREQUENCIES.includes(frequency)) {
      return Response.json({ error: 'Invalid frequency' }, { status: 400 });
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return Response.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }

    const name = merchantName.trim();
    // Manual rows still get a normalized key so they can't collide with a
    // detected series for the same merchant.
    const merchantKey = `manual:${normalizeMerchant(name)}:${generateId().slice(0, 8)}`;

    const [row] = await db
      .insert(recurringSeries)
      .values({
        id: generateId(),
        userId: user.id,
        merchantKey,
        merchantName: name,
        status: 'confirmed',
        isManual: true,
        frequency,
        amount: parsedAmount.toString(),
        categoryId: categoryId || null,
        nextDate: nextDate ? parseDateInput(nextDate) : new Date(),
        isIncome: !!isIncome,
      })
      .returning();

    return Response.json(row, { status: 201 });
  } catch (error) {
    console.error('Error creating recurring series:', error);
    return Response.json({ error: 'Failed to create recurring series' }, { status: 500 });
  }
}
