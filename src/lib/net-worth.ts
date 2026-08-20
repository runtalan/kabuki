import { db } from '@/db';
import { accountBalanceHistory, transactions } from '@/db/schema';
import { and, eq, gte, inArray, isNull } from 'drizzle-orm';
import { getUserAccounts } from './queries';
import { matchesOwnerFilter, type OwnerFilter } from './owner-filter';

export type NetWorthRange = '1m' | '3m' | '6m' | 'ytd' | '1y' | 'all';

export function rangeToSinceDate(range: NetWorthRange): Date | null {
  const now = new Date();
  switch (range) {
    case '1m': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    case '3m': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    case '6m': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d;
    }
    case 'ytd':
      return new Date(now.getFullYear(), 0, 1);
    case '1y': {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    case 'all':
    default:
      return null;
  }
}

// Reconstructs a daily net-worth series from real balance snapshots: assets
// add, liabilities subtract, using each account's most recent known balance
// as of that day (carried forward between syncs). Replaces the old
// fabricated linear trend with the household's actual history.
export async function getNetWorthSeries(
  userId: string,
  range: NetWorthRange,
  ownerFilter: OwnerFilter = 'all'
) {
  const userAccounts = await getUserAccounts(userId, ownerFilter);
  const accountIds = userAccounts.map((a) => a.id);
  if (accountIds.length === 0) return [];

  const kindByAccount = new Map(userAccounts.map((a) => [a.id, a.kind]));

  const history = await db.query.accountBalanceHistory.findMany({
    where: inArray(accountBalanceHistory.accountId, accountIds),
    orderBy: (row, { asc }) => asc(row.recordedAt),
  });

  if (history.length === 0) return [];

  const byAccount = new Map<string, { balance: number; recordedAt: Date }[]>();
  for (const h of history) {
    const arr = byAccount.get(h.accountId) || [];
    arr.push({ balance: Number(h.balance), recordedAt: new Date(h.recordedAt) });
    byAccount.set(h.accountId, arr);
  }

  const earliestRecord = new Date(history[0].recordedAt);
  const requestedSince = rangeToSinceDate(range);
  const startDate = requestedSince && requestedSince > earliestRecord ? requestedSince : earliestRecord;
  startDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Net external cash flow per day: transaction amounts are signed
  // (positive = money in), and internal transfers / hidden rows are excluded
  // the same way the cash-flow queries exclude them. This lets the client
  // split a window's net-worth change into "money you added" vs
  // "market & other" (the residual: investment gains, property revaluation,
  // interest, and anything transactions don't capture).
  const ownerByAccount = new Map(userAccounts.map((a) => [a.id, a.owner]));
  const windowTxs = (
    await db.query.transactions.findMany({
      where: and(
        inArray(transactions.accountId, accountIds),
        gte(transactions.date, startDate),
        eq(transactions.hidden, false),
        isNull(transactions.transferType)
      ),
      columns: { amount: true, date: true, accountId: true, ownerOverride: true },
    })
  ).filter((tx) =>
    matchesOwnerFilter(tx.ownerOverride, ownerByAccount.get(tx.accountId), ownerFilter)
  );
  const flowByDay = new Map<string, number>();
  for (const tx of windowTxs) {
    const key = new Date(tx.date).toISOString().slice(0, 10);
    flowByDay.set(key, (flowByDay.get(key) || 0) + Number(tx.amount));
  }

  const pointers = new Map<string, number>();
  for (const id of accountIds) pointers.set(id, -1);

  const series: {
    date: string;
    iso: string;
    netWorth: number;
    assets: number;
    liabilities: number;
    flow: number;
  }[] = [];
  const cursor = new Date(startDate);

  while (cursor <= today) {
    const dayEnd = new Date(cursor);
    dayEnd.setHours(23, 59, 59, 999);

    let assetTotal = 0;
    let liabilityTotal = 0;
    for (const accId of accountIds) {
      const snaps = byAccount.get(accId) || [];
      let idx = pointers.get(accId)!;
      while (idx + 1 < snaps.length && snaps[idx + 1].recordedAt <= dayEnd) {
        idx++;
      }
      pointers.set(accId, idx);
      if (idx === -1) continue; // account has no snapshot yet as of this day
      if (kindByAccount.get(accId) === 'liability') {
        liabilityTotal += snaps[idx].balance;
      } else {
        assetTotal += snaps[idx].balance;
      }
    }

    const iso = cursor.toISOString().slice(0, 10);
    series.push({
      date: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      iso,
      netWorth: Math.round(assetTotal - liabilityTotal),
      assets: Math.round(assetTotal),
      liabilities: Math.round(liabilityTotal),
      flow: Math.round(flowByDay.get(iso) || 0),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return series;
}

// Net money moved into (positive) or out of (negative) each account over the
// trailing `days` days, from signed transaction amounts. Transfers are
// deliberately INCLUDED — from a single account's perspective, a deposit
// from your own checking is still money added — but hidden transactions are
// excluded. Accounts with no transactions in the window are absent from the
// result (no feed or no activity), so callers can render "nothing" instead
// of a misleading $0.
export async function getAccountFlows(
  userId: string,
  days = 30,
  ownerFilter: OwnerFilter = 'all'
): Promise<Record<string, number>> {
  const userAccounts = await getUserAccounts(userId, ownerFilter);
  const accountIds = userAccounts.map((a) => a.id);
  if (accountIds.length === 0) return {};

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const rows = await db.query.transactions.findMany({
    where: and(
      inArray(transactions.accountId, accountIds),
      gte(transactions.date, since),
      eq(transactions.hidden, false)
    ),
    columns: { accountId: true, amount: true },
  });

  const flows: Record<string, number> = {};
  for (const row of rows) {
    flows[row.accountId] = (flows[row.accountId] || 0) + Number(row.amount);
  }
  return flows;
}

// Current net worth: sum of asset balances minus liability balances.
export async function getCurrentNetWorth(userId: string, ownerFilter: OwnerFilter = 'all') {
  const userAccounts = await getUserAccounts(userId, ownerFilter);
  return userAccounts.reduce((sum, acc) => {
    const balance = Number(acc.currentBalance);
    return sum + (acc.kind === 'liability' ? -balance : balance);
  }, 0);
}
