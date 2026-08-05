import { db } from '@/db';
import { rules, transactions, categories } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { guessCategoryName } from './smart-categorize';

// Override precedence: manual (user click) > rule (user-authored) > smart
// (built-in merchant guess). A lower-precedence source may only write a
// category when the transaction's current source doesn't outrank it.
const PRECEDENCE: Record<string, number> = { manual: 3, rule: 2, smart: 1 };

function canOverride(currentSource: string | null, incomingSource: string) {
  if (!currentSource) return true;
  return PRECEDENCE[incomingSource] > PRECEDENCE[currentSource];
}

function matchesRule(merchantLower: string, rule: { merchantName: string; matchType: string }) {
  const nameLower = rule.merchantName.toLowerCase();
  switch (rule.matchType) {
    case 'exact':
      return merchantLower === nameLower;
    case 'startsWith':
      return merchantLower.startsWith(nameLower);
    case 'contains':
    default:
      return merchantLower.includes(nameLower);
  }
}

// Categorize a single transaction: user rules first, then the built-in smart
// merchant guesser. Used for brand-new transactions coming out of Plaid sync,
// where categoryId is still null.
export async function autoTagTransaction(
  userId: string,
  transactionId: string,
  merchant?: string | null
) {
  if (!merchant) return;
  const merchantLower = merchant.toLowerCase();

  const userRules = await db.query.rules.findMany({
    where: eq(rules.userId, userId),
    orderBy: (rule, { desc }) => desc(rule.priority),
  });

  for (const rule of userRules) {
    if (!rule.enabled) continue;
    if (matchesRule(merchantLower, rule)) {
      await db
        .update(transactions)
        .set({ categoryId: rule.categoryId, categorySource: 'rule', updatedAt: new Date() })
        .where(eq(transactions.id, transactionId));
      return;
    }
  }

  const guessedName = guessCategoryName(merchant);
  if (!guessedName) return;

  const category = await db.query.categories.findFirst({
    where: eq(categories.name, guessedName),
  });
  if (!category) return;

  await db
    .update(transactions)
    .set({ categoryId: category.id, categorySource: 'smart', updatedAt: new Date() })
    .where(eq(transactions.id, transactionId));
}

// Applies a freshly created/edited rule to the user's existing transactions
// whose merchant matches, but only where the current category came from a
// lower-precedence source (smart guess or nothing) — never touches manual
// tags. Returns the number of transactions updated.
export async function applyRuleToExistingTransactions(
  userId: string,
  rule: { categoryId: string; merchantName: string; matchType: string }
): Promise<number> {
  // Drizzle's relational query API needs an explicit join path back to the
  // user through account -> plaidItem, so fetch via the accounts relation.
  const rows = await db.query.plaidItems.findMany({
    where: (item, { eq: eqOp }) => eqOp(item.userId, userId),
    with: {
      accounts: {
        with: {
          transactions: true,
        },
      },
    },
  });

  const candidates = rows.flatMap((item) =>
    item.accounts.flatMap((acc) => acc.transactions)
  );

  const nameLower = rule.merchantName.toLowerCase();
  let updated = 0;

  for (const tx of candidates) {
    if (!canOverride(tx.categorySource, 'rule')) continue;
    const merchantLower = (tx.merchant || tx.name).toLowerCase();
    const matched =
      rule.matchType === 'exact'
        ? merchantLower === nameLower
        : rule.matchType === 'startsWith'
        ? merchantLower.startsWith(nameLower)
        : merchantLower.includes(nameLower);

    if (matched && tx.categoryId !== rule.categoryId) {
      await db
        .update(transactions)
        .set({ categoryId: rule.categoryId, categorySource: 'rule', updatedAt: new Date() })
        .where(eq(transactions.id, tx.id));
      updated++;
    }
  }

  return updated;
}

// Runs the smart merchant guesser over every transaction for a user that
// isn't already manually or rule-tagged. Used for the "deep analysis" pass
// over existing/historical transactions, and safe to re-run any time — it
// never touches manual or rule-sourced categories.
export async function runSmartCategorization(userId: string): Promise<number> {
  const rows = await db.query.plaidItems.findMany({
    where: (item, { eq: eqOp }) => eqOp(item.userId, userId),
    with: {
      accounts: {
        with: {
          transactions: true,
        },
      },
    },
  });

  const allCategories = await db.query.categories.findMany();
  const categoryByName = new Map(allCategories.map((c) => [c.name, c.id]));

  const candidates = rows.flatMap((item) =>
    item.accounts.flatMap((acc) => acc.transactions)
  );

  let tagged = 0;
  for (const tx of candidates) {
    if (!canOverride(tx.categorySource, 'smart')) continue;
    if (tx.categoryId && tx.categorySource) continue; // already has a source we can't beat

    const merchant = tx.merchant || tx.name;
    const guessedName = guessCategoryName(merchant);
    if (!guessedName) continue;

    const categoryId = categoryByName.get(guessedName);
    if (!categoryId) continue;

    await db
      .update(transactions)
      .set({ categoryId, categorySource: 'smart', updatedAt: new Date() })
      .where(eq(transactions.id, tx.id));
    tagged++;
  }

  return tagged;
}
