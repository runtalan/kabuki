import { db } from '@/db';
import { integrationTokens, transactions, apiRequestLogs } from '@/db/schema';
import { eq, and, gte, count } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { hashToken } from '@/lib/integration-tokens';
import { autoTagTransaction } from '@/lib/auto-tag';
import { recomputeMonthlyBalance } from '@/lib/monthly-balance';

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

function sanitizeCard(raw: unknown): string | null {
  const value = String(raw ?? '')
    .replace(/[\x00-\x1F\x7F<>]/g, '')
    .trim()
    .slice(0, 100);
  return value || null;
}

function parseAmount(raw: unknown): number | null {
  const value = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(value) ? value : null;
}

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

// The payload shape from the Shortcut is still being dialed in, so field
// lookup is deliberately permissive: checks query params, then body, then
// headers, and tries every known alias for a given field (case-insensitive)
// before giving up.
function pickField(aliases: string[], sources: Record<string, unknown>[]): unknown {
  for (const source of sources) {
    for (const alias of aliases) {
      const key = Object.keys(source).find((k) => k.toLowerCase() === alias);
      if (key !== undefined && source[key] !== undefined && source[key] !== '') {
        return source[key];
      }
    }
  }
  return undefined;
}

// Personal transaction-ingest endpoint for the Apple Card Sync Shortcut —
// see Settings > Integrations for the setup flow and payload shape. Auth is
// a per-user token (query string, by design — Shortcuts' URL action can't
// set custom headers) checked against a stored hash, not a session cookie;
// this route is deliberately outside normal auth middleware. Every request
// (success or failure) is logged to `api_request_logs` — see the debug
// panel in Settings — so mis-shaped Shortcut payloads can be diagnosed
// without SSH-ing into anything.
async function handle(request: Request, method: 'GET' | 'POST') {
  const url = new URL(request.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (key !== 'token') query[key] = value;
  });
  const headerObj = headersToObject(request.headers);

  let owner: string | null = null;
  let parsed: Record<string, unknown> = {};
  let errorMsg: string | null = null;
  let transactionId: string | null = null;
  let rawBody = '';

  const respond = async (body: unknown, status: number) => {
    try {
      await db.insert(apiRequestLogs).values({
        id: generateId(),
        provider: PROVIDER,
        method,
        owner,
        statusCode: status,
        headers: JSON.stringify(headerObj),
        queryParams: Object.keys(query).length ? JSON.stringify(query) : null,
        body: rawBody || null,
        parsed: Object.keys(parsed).length ? JSON.stringify(parsed) : null,
        error: errorMsg,
        transactionId,
        createdAt: new Date(),
      });
    } catch (logError) {
      console.error('Error writing Apple Card request log:', logError);
    }
    return Response.json(body as object, { status });
  };

  try {
    // Cloud Run/App Hosting terminates TLS and forwards over plain HTTP
    // internally, setting this header for the original scheme — reject
    // anything that didn't arrive as HTTPS. Skipped outside production so
    // `http://localhost` still works for local testing.
    const proto = request.headers.get('x-forwarded-proto');
    if (process.env.NODE_ENV === 'production' && proto && proto !== 'https') {
      errorMsg = 'HTTPS required';
      return respond({ error: errorMsg }, 403);
    }

    const token = url.searchParams.get('token');
    if (!token) {
      errorMsg = 'Missing token';
      return respond({ error: errorMsg }, 401);
    }

    const integration = await db.query.integrationTokens.findFirst({
      where: and(eq(integrationTokens.tokenHash, hashToken(token)), eq(integrationTokens.provider, PROVIDER)),
      with: { user: true },
    });
    if (!integration || !integration.accountId) {
      errorMsg = 'Invalid token';
      return respond({ error: errorMsg }, 401);
    }
    owner = integration.user?.username ?? null;

    const [{ value: todayCount }] = await db
      .select({ value: count() })
      .from(transactions)
      .where(
        and(eq(transactions.accountId, integration.accountId), gte(transactions.createdAt, startOfTodayUTC()))
      );
    if (todayCount >= DAILY_LIMIT) {
      errorMsg = `Daily limit of ${DAILY_LIMIT} transactions reached`;
      return respond({ error: errorMsg }, 429);
    }

    let bodyFields: Record<string, unknown> = {};
    if (method === 'POST') {
      const contentType = (request.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('multipart/form-data')) {
        // Shortcuts' "Form" request body can send multipart instead of
        // urlencoded depending on config — formData() parses either, but
        // needs the untouched request (can't also read it as text first).
        try {
          const form = await request.formData();
          bodyFields = Object.fromEntries(form.entries()) as Record<string, unknown>;
          rawBody = JSON.stringify(bodyFields);
        } catch {
          errorMsg = 'Invalid form body';
          return respond({ error: errorMsg }, 400);
        }
      } else {
        rawBody = await request.text();
        if (rawBody) {
          if (contentType.includes('application/json')) {
            try {
              bodyFields = JSON.parse(rawBody);
            } catch {
              errorMsg = 'Invalid JSON body';
              return respond({ error: errorMsg }, 400);
            }
          } else {
            // application/x-www-form-urlencoded — Shortcuts' "Form" request
            // body type — or no content-type at all. Try form-encoding
            // first (URLSearchParams never throws), then JSON as a fallback
            // for any client that skipped the header.
            bodyFields = Object.fromEntries(new URLSearchParams(rawBody));
            if (Object.keys(bodyFields).length === 0) {
              try {
                bodyFields = JSON.parse(rawBody);
              } catch {
                // Leave bodyFields empty — field lookup below will report
                // "merchant/transaction is required" rather than a generic
                // parse error, which is more actionable for debugging.
              }
            }
          }
        }
      }
    }

    const sources = [query, bodyFields, headerObj];
    const merchant = sanitizeMerchant(pickField(['transaction', 'merchant', 'name'], sources));
    const card = sanitizeCard(pickField(['card'], sources));
    const amount = parseAmount(pickField(['amount'], sources));
    const dateRaw = pickField(['date'], sources);
    const date =
      typeof dateRaw === 'string' && !Number.isNaN(Date.parse(dateRaw)) ? new Date(dateRaw) : new Date();
    const typeRaw = pickField(['type'], sources);
    const isCredit = typeof typeRaw === 'string' && typeRaw.toLowerCase() === 'credit';

    parsed = { merchant, amount, date: date.toISOString(), card, type: isCredit ? 'credit' : 'debit' };

    if (!merchant) {
      errorMsg = 'merchant/transaction is required';
      return respond({ error: errorMsg }, 400);
    }
    if (amount === null) {
      errorMsg = 'amount must be a number';
      return respond({ error: errorMsg }, 400);
    }

    transactionId = generateId();
    await db.insert(transactions).values({
      id: transactionId,
      accountId: integration.accountId,
      plaidTransactionId: `apple-card-${transactionId}`,
      name: merchant,
      merchant,
      notes: card ? `Card: ${card}` : null,
      amount: (isCredit ? Math.abs(amount) : -Math.abs(amount)).toString(),
      type: isCredit ? 'credit' : 'debit',
      date,
      pending: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Recompute from this calendar month's transactions rather than
    // incrementing — always correct, self-heals if a past edit/hide/split
    // changes what counts, and naturally reads $0 next month with no reset
    // step (see recomputeMonthlyBalance).
    await recomputeMonthlyBalance(integration.accountId);

    await autoTagTransaction(integration.userId, transactionId, merchant);
    await db
      .update(integrationTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(integrationTokens.id, integration.id));

    return respond({ ok: true, id: transactionId }, 201);
  } catch (error) {
    console.error('Error handling Apple Card request:', error);
    errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return respond({ error: 'Failed to record transaction' }, 500);
  }
}

export async function POST(request: Request) {
  return handle(request, 'POST');
}

// GET support exists for debugging Shortcut configs that end up sending a
// GET instead of POST (e.g. a misconfigured "Get Contents of URL" action) —
// it accepts the same fields via query params and logs headers exactly like
// POST does, rather than silently 405-ing and leaving no trace of what
// arrived.
export async function GET(request: Request) {
  return handle(request, 'GET');
}
