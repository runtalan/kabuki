import { db } from '@/db';
import { integrationTokens, transactions } from '@/db/schema';
import { eq, and, gte, count } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { hashToken } from '@/lib/integration-tokens';
import { autoTagTransaction } from '@/lib/auto-tag';

const PROVIDER = 'apple_card';
const DAILY_LIMIT = 30;

// Strips anything that isn't a plain printable character and caps length —
// this is rendered as plain text everywhere (React escapes it regardless),
// but a Shortcut's "Get Details of Safari Web Page"-style extraction can hand
// back near-arbitrary strings, so treat it as untrusted input at the door.
function sanitizeMerchant(raw: unknown): string {
  return String(raw ?? '')
    .replace(/[\x00-\x1F\x7F<>]/g, '')
    .trim()
    .slice(0, 255);
}

function parseAmount(raw: unknown): number | null {
  const value = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(value) ? value : null;
}

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Personal transaction-ingest endpoint for the Apple Card Sync Shortcut —
// see Settings > Integrations for the setup flow and payload shape. Auth is
// a per-user token (query string, by design — Shortcuts' URL action can't
// set custom headers) checked against a stored hash, not a session cookie;
// this route is deliberately outside normal auth middleware.
export async function POST(request: Request) {
  try {
    // Cloud Run/App Hosting terminates TLS and forwards over plain HTTP
    // internally, setting this header for the original scheme — reject
    // anything that didn't arrive as HTTPS. Skipped outside production so
    // `http://localhost` still works for local testing.
    const proto = request.headers.get('x-forwarded-proto');
    if (process.env.NODE_ENV === 'production' && proto && proto !== 'https') {
      return Response.json({ error: 'HTTPS required' }, { status: 403 });
    }

    const token = new URL(request.url).searchParams.get('token');
    if (!token) {
      return Response.json({ error: 'Missing token' }, { status: 401 });
    }

    const integration = await db.query.integrationTokens.findFirst({
      where: and(eq(integrationTokens.tokenHash, hashToken(token)), eq(integrationTokens.provider, PROVIDER)),
    });
    if (!integration || !integration.accountId) {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    const [{ value: todayCount }] = await db
      .select({ value: count() })
      .from(transactions)
      .where(
        and(eq(transactions.accountId, integration.accountId), gte(transactions.createdAt, startOfTodayUTC()))
      );
    if (todayCount >= DAILY_LIMIT) {
      return Response.json(
        { error: `Daily limit of ${DAILY_LIMIT} transactions reached` },
        { status: 429 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const merchant = sanitizeMerchant(body.merchant ?? body.name);
    if (!merchant) {
      return Response.json({ error: 'merchant is required' }, { status: 400 });
    }
    const amount = parseAmount(body.amount);
    if (amount === null) {
      return Response.json({ error: 'amount must be a number' }, { status: 400 });
    }
    const isCredit = body.type === 'credit';
    const date = typeof body.date === 'string' && !Number.isNaN(Date.parse(body.date))
      ? new Date(body.date)
      : new Date();

    const transactionId = generateId();
    await db.insert(transactions).values({
      id: transactionId,
      accountId: integration.accountId,
      plaidTransactionId: `apple-card-${transactionId}`,
      name: merchant,
      merchant,
      amount: (isCredit ? Math.abs(amount) : -Math.abs(amount)).toString(),
      type: isCredit ? 'credit' : 'debit',
      date,
      pending: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await autoTagTransaction(integration.userId, transactionId, merchant);
    await db
      .update(integrationTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(integrationTokens.id, integration.id));

    return Response.json({ ok: true, id: transactionId }, { status: 201 });
  } catch (error) {
    console.error('Error ingesting Apple Card transaction:', error);
    return Response.json({ error: 'Failed to record transaction' }, { status: 500 });
  }
}
