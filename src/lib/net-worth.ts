import { db } from '@/db';
import { accountBalanceHistory } from '@/db/schema';
import { inArray } from 'drizzle-orm';
import { getUserAccounts } from './queries';

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
export async function getNetWorthSeries(userId: string, range: NetWorthRange) {
  const userAccounts = await getUserAccounts(userId);
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

  const pointers = new Map<string, number>();
  for (const id of accountIds) pointers.set(id, -1);

  const series: { date: string; netWorth: number }[] = [];
  const cursor = new Date(startDate);

  while (cursor <= today) {
    const dayEnd = new Date(cursor);
    dayEnd.setHours(23, 59, 59, 999);

    let net = 0;
    for (const accId of accountIds) {
      const snaps = byAccount.get(accId) || [];
      let idx = pointers.get(accId)!;
      while (idx + 1 < snaps.length && snaps[idx + 1].recordedAt <= dayEnd) {
        idx++;
      }
      pointers.set(accId, idx);
      if (idx === -1) continue; // account has no snapshot yet as of this day
      const kind = kindByAccount.get(accId);
      net += kind === 'liability' ? -snaps[idx].balance : snaps[idx].balance;
    }

    series.push({
      date: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      netWorth: Math.round(net),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return series;
}

// Current net worth: sum of asset balances minus liability balances.
export async function getCurrentNetWorth(userId: string) {
  const userAccounts = await getUserAccounts(userId);
  return userAccounts.reduce((sum, acc) => {
    const balance = Number(acc.currentBalance);
    return sum + (acc.kind === 'liability' ? -balance : balance);
  }, 0);
}
