// Generates and lazily tops up the shared demo account's fake transaction
// history. Design goals (see the "demo account" plan for full rationale):
//
//  - No cron job. Nothing runs unless someone actually logs in as demo.
//  - Bounded compute: at most one real calendar day's worth of generation
//    per real day, no matter how many demo logins happen that day.
//  - Bounded storage: a rolling ~14-month window, trimmed at the old end.
//  - Deterministic: any given calendar day always generates the same
//    transactions (seeded PRNG keyed by the ISO date string), so re-running
//    the top-up over a day range that overlaps prior work is idempotent.
//  - Recurring-detection-friendly: a handful of fixed-cadence, fixed-amount
//    "spine" transactions run right up through today, satisfying the real
//    heuristic in getRecurringItems (src/lib/spending-insights.ts) so the
//    Recurring tab doesn't look broken on demo data.
import { sql, eq, and, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  plaidItems,
  accounts,
  transactions,
  accountBalanceHistory,
  recurringSeries,
} from "@/db/schema";
import { generateId } from "./id";
import {
  DEMO_PLAID_ITEM_ITEM_ID,
  DEMO_CHECKING_ACCOUNT_ID,
  DEMO_CREDIT_ACCOUNT_ID,
} from "./demo";

const ROLLING_MONTHS = 14;

// ---- date helpers (local-time construction, matching src/lib/date.ts's
// UTC-midnight-avoidance convention rather than raw ISO parsing) ----

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function compactDay(d: Date): string {
  return isoDay(d).replace(/-/g, "");
}

// ---- deterministic seeded PRNG (mulberry32), keyed by calendar day ----

function hashDaySeed(iso: string): number {
  let h = 2166136261;
  for (let i = 0; i < iso.length; i++) {
    h ^= iso.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- recurring "spine" — deliberately regular so the real recurring-
// detection heuristic (weekly/biweekly/monthly/yearly gap buckets, >=60%
// amount consistency) picks these up as active series ----

type SpineEntry = {
  merchant: string;
  categoryName: string;
  amount: number; // negative = expense, positive = income (matches app convention)
  accountId: string;
} & (
  | { cadence: "monthly"; dayOfMonth: number }
  | { cadence: "biweekly"; anchor: string } // ISO date, first occurrence
);

const RECURRING_SPINE: SpineEntry[] = [
  {
    merchant: "ACME Property Mgmt",
    categoryName: "Bills",
    amount: -2200,
    accountId: DEMO_CHECKING_ACCOUNT_ID,
    cadence: "monthly",
    dayOfMonth: 1,
  },
  {
    merchant: "Xfinity Internet",
    categoryName: "Utilities",
    amount: -89,
    accountId: DEMO_CHECKING_ACCOUNT_ID,
    cadence: "monthly",
    dayOfMonth: 20,
  },
  {
    merchant: "Netflix",
    categoryName: "Subscription",
    amount: -15.49,
    accountId: DEMO_CREDIT_ACCOUNT_ID,
    cadence: "monthly",
    dayOfMonth: 14,
  },
  {
    merchant: "Spotify",
    categoryName: "Subscription",
    amount: -11.99,
    accountId: DEMO_CREDIT_ACCOUNT_ID,
    cadence: "monthly",
    dayOfMonth: 3,
  },
  {
    merchant: "Planet Fitness",
    categoryName: "Fitness",
    amount: -49.99,
    accountId: DEMO_CREDIT_ACCOUNT_ID,
    cadence: "monthly",
    dayOfMonth: 5,
  },
  {
    merchant: "Kabuki Corp Payroll",
    categoryName: "Income",
    amount: 3100,
    accountId: DEMO_CHECKING_ACCOUNT_ID,
    cadence: "biweekly",
    anchor: "2024-01-05",
  },
];

function spineOccursOn(entry: SpineEntry, day: Date): boolean {
  if (entry.cadence === "monthly") {
    return day.getDate() === entry.dayOfMonth;
  }
  const anchor = startOfLocalDay(
    new Date(
      Number(entry.anchor.slice(0, 4)),
      Number(entry.anchor.slice(5, 7)) - 1,
      Number(entry.anchor.slice(8, 10))
    )
  );
  const daysSince = Math.round((day.getTime() - anchor.getTime()) / 86_400_000);
  return daysSince >= 0 && daysSince % 14 === 0;
}

// ---- everyday, randomized spending ----

const EVERYDAY_CATEGORIES: {
  name: string;
  weight: number;
  merchants: string[];
  min: number;
  max: number;
}[] = [
  { name: "Dining", weight: 4, merchants: ["Starbucks", "Chipotle", "Panera", "Chick-fil-A", "Sweetgreen", "DoorDash"], min: 8, max: 65 },
  { name: "Groceries", weight: 3, merchants: ["Whole Foods", "Trader Joe's", "Safeway", "Kroger", "Costco", "Sprouts"], min: 15, max: 140 },
  { name: "Transport", weight: 3, merchants: ["Uber", "Lyft", "Shell", "Chevron", "Metro Transit"], min: 10, max: 70 },
  { name: "Shopping", weight: 2, merchants: ["Amazon", "Target", "Walmart", "Best Buy", "Etsy"], min: 20, max: 300 },
  { name: "Entertainment", weight: 1, merchants: ["AMC Theatres", "Steam", "Ticketmaster"], min: 10, max: 90 },
  { name: "Healthcare", weight: 1, merchants: ["CVS Pharmacy", "Walgreens"], min: 15, max: 120 },
];
const EVERYDAY_TOTAL_WEIGHT = EVERYDAY_CATEGORIES.reduce((s, c) => s + c.weight, 0);

function pickEverydayCategory(rng: () => number) {
  let roll = rng() * EVERYDAY_TOTAL_WEIGHT;
  for (const cat of EVERYDAY_CATEGORIES) {
    if (roll < cat.weight) return cat;
    roll -= cat.weight;
  }
  return EVERYDAY_CATEGORIES[0];
}

type GeneratedRow = {
  accountId: string;
  categoryName: string;
  merchant: string;
  amount: number;
};

function generateDayRows(day: Date): GeneratedRow[] {
  const rows: GeneratedRow[] = [];

  for (const entry of RECURRING_SPINE) {
    if (spineOccursOn(entry, day)) {
      rows.push({
        accountId: entry.accountId,
        categoryName: entry.categoryName,
        merchant: entry.merchant,
        amount: entry.amount,
      });
    }
  }

  const rng = mulberry32(hashDaySeed(isoDay(day)));
  let count = 0;
  while (rng() < 0.35 && count < 3) count++;
  for (let i = 0; i < count; i++) {
    const cat = pickEverydayCategory(rng);
    const merchant = cat.merchants[Math.floor(rng() * cat.merchants.length)];
    const amount = -(cat.min + rng() * (cat.max - cat.min));
    const accountId = rng() < 0.7 ? DEMO_CREDIT_ACCOUNT_ID : DEMO_CHECKING_ACCOUNT_ID;
    rows.push({
      accountId,
      categoryName: cat.name,
      merchant,
      amount: Math.round(amount * 100) / 100,
    });
  }

  return rows;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertDayTransactions(
  tx: any,
  day: Date,
  categoryIdByName: Map<string, string>
): Promise<GeneratedRow[]> {
  const rows = generateDayRows(day);
  if (rows.length === 0) return [];

  const cDay = compactDay(day);
  const values = rows.map((r, idx) => ({
    id: `demo-tx-${cDay}-${idx}`,
    accountId: r.accountId,
    categoryId: categoryIdByName.get(r.categoryName) ?? null,
    categorySource: "smart" as const,
    plaidTransactionId: `demo-plaid-tx-${cDay}-${idx}`,
    name: r.merchant,
    merchant: r.merchant,
    merchantCleanedUp: r.merchant,
    amount: r.amount.toFixed(2),
    type: (r.amount >= 0 ? "credit" : "debit") as "credit" | "debit",
    date: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9 + idx, 15),
    pending: false,
    hidden: false,
  }));

  await tx
    .insert(transactions)
    .values(values)
    .onConflictDoNothing({ target: transactions.plaidTransactionId });

  return rows;
}

// Top up the demo account's rolling window if it's stale, and trim the old
// end. No-ops instantly (before any row scan) if already generated through
// today — the common case, since at most one real day passes between calls.
export async function ensureDemoDataFresh(): Promise<void> {
  await db.transaction(async (tx) => {
    const locked = await tx.execute(
      sql`SELECT last_synced_at FROM plaid_items WHERE item_id = ${DEMO_PLAID_ITEM_ITEM_ID} FOR UPDATE`
    );
    const row = (locked as unknown as { last_synced_at: Date | null }[])[0];
    if (!row) return; // demo not seeded yet — nothing to do

    const today = startOfLocalDay(new Date());
    const lastGenerated = row.last_synced_at ? startOfLocalDay(new Date(row.last_synced_at)) : null;
    if (lastGenerated && lastGenerated.getTime() >= today.getTime()) return;

    const windowStart = addMonths(today, -ROLLING_MONTHS);
    const genFrom = lastGenerated ? addDays(lastGenerated, 1) : windowStart;

    const categoryRows = await tx.query.categories.findMany();
    const categoryIdByName = new Map(categoryRows.map((c: { name: string; id: string }) => [c.name, c.id]));

    const deltas = new Map<string, number>();
    for (let day = new Date(genFrom); day.getTime() <= today.getTime(); day = addDays(day, 1)) {
      const rows = await insertDayTransactions(tx, day, categoryIdByName);
      for (const r of rows) {
        deltas.set(r.accountId, (deltas.get(r.accountId) ?? 0) + r.amount);
      }
    }

    for (const [accountId, delta] of deltas) {
      if (delta === 0) continue;
      const [acct] = await tx.select().from(accounts).where(eq(accounts.id, accountId));
      if (!acct) continue;
      const newBalance = (Number(acct.currentBalance) + delta).toFixed(2);
      await tx
        .update(accounts)
        .set({ currentBalance: newBalance, lastSyncedAt: new Date(), updatedAt: new Date() })
        .where(eq(accounts.id, accountId));
      await tx.insert(accountBalanceHistory).values({
        id: generateId(),
        accountId,
        balance: newBalance,
        recordedAt: new Date(),
      });
    }

    await tx
      .delete(transactions)
      .where(
        and(
          inArray(transactions.accountId, [DEMO_CHECKING_ACCOUNT_ID, DEMO_CREDIT_ACCOUNT_ID]),
          lt(transactions.date, windowStart)
        )
      );

    await tx
      .update(plaidItems)
      .set({ lastSyncedAt: today, updatedAt: new Date() })
      .where(eq(plaidItems.itemId, DEMO_PLAID_ITEM_ITEM_ID));
  });
}

// Exported for the seed script, so it can pre-insert `recurringSeries` rows
// (status: 'confirmed') for each spine entry — demo is view-only, so no
// visitor can ever perform the confirm step the real review queue requires.
export function getRecurringSpineForSeed() {
  return RECURRING_SPINE.map((entry) => ({
    merchant: entry.merchant,
    categoryName: entry.categoryName,
    frequency: entry.cadence === "monthly" ? "monthly" : "biweekly",
    amount: entry.amount,
    isIncome: entry.amount > 0,
  }));
}

