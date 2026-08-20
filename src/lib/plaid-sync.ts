import { db } from "@/db";
import {
  accounts,
  accountBalanceHistory,
  plaidItems,
  transactions,
  transactionTypeEnum,
} from "@/db/schema";
import { eq, and, inArray, ne } from "drizzle-orm";
import { PlaidApi, AccountBase } from "plaid";
import { generateId } from "./id";
import { getHouseholdUserIds } from "./household";
import { autoTagTransaction } from "./auto-tag";
import { cacheMerchantLogo, slugifyMerchantKey } from "./merchant-logo";
import { mapPfcToTransferType } from "./smart-categorize";

// Plaid's own account.type — 'credit' and 'loan' carry a balance you owe,
// everything else (depository, investment, brokerage) is an asset.
function deriveKind(plaidType: string): "asset" | "liability" {
  return plaidType === "credit" || plaidType === "loan" ? "liability" : "asset";
}

// Re-linking an institution through Plaid Link mints a BRAND NEW item_id,
// access_token, and — critically — a brand new account_id for every account,
// because Plaid account_ids are scoped to the Item, not to the real-world
// account. So the unique index on accounts.plaid_account_id does NOT stop a
// re-link from duplicating accounts the household already had: the ids simply
// never collide. Everything below exists to recognise "this is the same real
// account under a new id" and re-point the existing row instead of inserting
// a second one (which would also reset the owner to whoever re-linked it, and
// strand the account's transactions and customisations on the old row).

type AccountRow = typeof accounts.$inferSelect;

function normalizeName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Accounts under the same institution that could be the same real account as
// `plaidAccount`. Mask (last 4) plus Plaid's type/subtype is the strong
// signal; when neither side has a mask we fall back to the name.
export function findAdoptionCandidates(
  candidates: AccountRow[],
  plaidAccount: AccountBase
): AccountRow[] {
  const type = plaidAccount.type as string;
  const subtype = (plaidAccount.subtype as string | null) || null;
  const sameShape = candidates.filter(
    (c) => c.type === type && (c.subtype ?? null) === subtype
  );

  if (plaidAccount.mask) {
    const byMask = sameShape.filter((c) => c.mask === plaidAccount.mask);
    if (byMask.length > 0) return byMask;
    // A mask on the incoming account that matches nothing means this really
    // is a different account — don't fall through to fuzzy name matching.
    return [];
  }

  const name = normalizeName(plaidAccount.name);
  const officialName = normalizeName(plaidAccount.official_name);
  return sameShape.filter(
    (c) =>
      c.mask === null &&
      (normalizeName(c.name) === name ||
        (officialName !== "" && normalizeName(c.officialName) === officialName))
  );
}

interface AdoptionPool {
  rows: AccountRow[];
  // Item id -> when that item was linked. Direction matters: a newer link may
  // take an account over from an older one, never the other way round.
  linkedAt: Map<string, Date>;
}

// Existing accounts for this household at the same institution that are NOT
// already part of this Plaid item — i.e. the pool a re-link can adopt from.
async function loadAdoptionPool(
  plaidItem: typeof plaidItems.$inferSelect
): Promise<AdoptionPool> {
  const empty: AdoptionPool = { rows: [], linkedAt: new Map() };
  if (!plaidItem.institutionId) return empty;

  const householdUserIds = await getHouseholdUserIds(plaidItem.userId);
  const siblingItems = await db.query.plaidItems.findMany({
    where: and(
      inArray(plaidItems.userId, householdUserIds),
      eq(plaidItems.institutionId, plaidItem.institutionId),
      ne(plaidItems.id, plaidItem.id)
    ),
  });
  if (siblingItems.length === 0) return empty;

  const rows = await db.query.accounts.findMany({
    where: and(
      inArray(
        accounts.plaidItemId,
        siblingItems.map((i) => i.id)
      ),
      eq(accounts.isManual, false)
    ),
  });

  return {
    rows,
    linkedAt: new Map(siblingItems.map((i) => [i.id, i.createdAt])),
  };
}

// Drop Plaid items that no longer own any account — every account they had was
// adopted by a newer item for the same institution. Leaving them behind is not
// cosmetic: the next /api/plaid/sync would fetch the stale item's accounts,
// fail to match them by plaid_account_id, and adopt the rows straight back,
// ping-ponging accounts between items on every sync.
export async function pruneEmptyPlaidItems(
  plaidClient: PlaidApi,
  itemIds: string[]
) {
  for (const id of itemIds) {
    const remaining = await db.query.accounts.findMany({
      where: eq(accounts.plaidItemId, id),
    });
    if (remaining.length > 0) continue;

    const item = await db.query.plaidItems.findFirst({
      where: eq(plaidItems.id, id),
    });
    if (!item || item.isManual) continue;

    // Best-effort: tell Plaid to stop billing/refreshing the orphaned item.
    try {
      await plaidClient.itemRemove({ access_token: item.accessToken });
    } catch (error) {
      console.error(`Failed to remove stale Plaid item ${item.itemId}:`, error);
    }
    await db.delete(plaidItems).where(eq(plaidItems.id, id));
  }
}

// Identity of a real-world account, independent of the Plaid item it happens
// to be linked through. Mask + type + subtype is the strong form; accounts
// with no mask fall back to their name.
export function accountIdentityKey(account: AccountRow): string {
  const shape = `${account.type}|${account.subtype ?? ""}`;
  return account.mask
    ? `${shape}|mask:${account.mask}`
    : `${shape}|name:${normalizeName(account.name)}`;
}

function transactionDedupeKey(tx: typeof transactions.$inferSelect): string {
  return [
    tx.date.toISOString().split("T")[0],
    Number(tx.amount).toFixed(2),
    normalizeName(tx.name),
  ].join("|");
}

export interface MergeReport {
  merged: Array<{
    keptAccountId: string;
    keptName: string;
    removedAccountIds: string[];
    movedTransactions: number;
    droppedDuplicateTransactions: number;
  }>;
  prunedItemIds: string[];
}

// Repair duplicates that already exist: the same real account linked twice
// (or more) through different Plaid items at the same institution. Keeps the
// OLDEST row — it owns the transaction history, the owner assignment, and any
// display-name/icon customisation — but re-points it at the NEWEST item's
// credentials, since that's the item whose access token still works. Losing
// rows hand over their transactions and balance history and are deleted.
//
// Safe to run repeatedly; with no duplicates it does nothing.
export async function mergeDuplicateAccounts(
  plaidClient: PlaidApi | null,
  householdUserIds: string[],
  options: { dryRun?: boolean } = {}
): Promise<MergeReport> {
  const report: MergeReport = { merged: [], prunedItemIds: [] };

  const items = await db.query.plaidItems.findMany({
    where: and(
      inArray(plaidItems.userId, householdUserIds),
      eq(plaidItems.isManual, false)
    ),
  });
  if (items.length < 2) return report;

  const itemById = new Map(items.map((i) => [i.id, i]));
  const allAccounts = await db.query.accounts.findMany({
    where: and(
      inArray(
        accounts.plaidItemId,
        items.map((i) => i.id)
      ),
      eq(accounts.isManual, false)
    ),
  });

  // Group by institution + account identity.
  const groups = new Map<string, AccountRow[]>();
  for (const account of allAccounts) {
    const item = itemById.get(account.plaidItemId);
    if (!item) continue;
    const institutionKey =
      item.institutionId || normalizeName(item.institutionName) || item.id;
    const key = `${institutionKey}::${accountIdentityKey(account)}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(account);
    else groups.set(key, [account]);
  }

  const touchedItemIds = new Set<string>();

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const byAge = [...group].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    const keeper = byAge[0];
    const losers = byAge.slice(1);

    // The account whose Plaid item is newest carries the live access token.
    const live = [...group].sort((a, b) => {
      const aAt = itemById.get(a.plaidItemId)?.createdAt.getTime() ?? 0;
      const bAt = itemById.get(b.plaidItemId)?.createdAt.getTime() ?? 0;
      return bAt - aAt;
    })[0];

    const entry = {
      keptAccountId: keeper.id,
      keptName: keeper.displayName || keeper.name,
      removedAccountIds: losers.map((l) => l.id),
      movedTransactions: 0,
      droppedDuplicateTransactions: 0,
    };

    if (options.dryRun) {
      report.merged.push(entry);
      continue;
    }

    const keeperTransactions = await db.query.transactions.findMany({
      where: eq(transactions.accountId, keeper.id),
    });
    const seen = new Set(keeperTransactions.map(transactionDedupeKey));

    for (const loser of losers) {
      touchedItemIds.add(loser.plaidItemId);

      const loserTransactions = await db.query.transactions.findMany({
        where: eq(transactions.accountId, loser.id),
      });

      for (const tx of loserTransactions) {
        const key = transactionDedupeKey(tx);
        if (seen.has(key)) {
          // Same real transaction under the re-link's new transaction_id —
          // the keeper's copy holds the user's category/tags, so drop this one.
          await db.delete(transactions).where(eq(transactions.id, tx.id));
          entry.droppedDuplicateTransactions++;
        } else {
          await db
            .update(transactions)
            .set({ accountId: keeper.id, updatedAt: new Date() })
            .where(eq(transactions.id, tx.id));
          seen.add(key);
          entry.movedTransactions++;
        }
      }

      await db
        .update(accountBalanceHistory)
        .set({ accountId: keeper.id })
        .where(eq(accountBalanceHistory.accountId, loser.id));

      await db.delete(accounts).where(eq(accounts.id, loser.id));
    }

    // Point the surviving row at the live item/account id and the freshest
    // balance, while keeping its own owner, display name and icon.
    if (live.id !== keeper.id) {
      await db
        .update(accounts)
        .set({
          plaidItemId: live.plaidItemId,
          plaidAccountId: live.plaidAccountId,
          currentBalance: live.currentBalance,
          availableBalance: live.availableBalance,
          mask: live.mask ?? keeper.mask,
          lastSyncedAt: live.lastSyncedAt,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, keeper.id));
    }

    report.merged.push(entry);
  }

  if (!options.dryRun && plaidClient && touchedItemIds.size > 0) {
    const before = new Set(touchedItemIds);
    await pruneEmptyPlaidItems(plaidClient, [...touchedItemIds]);
    for (const id of before) {
      const stillThere = await db.query.plaidItems.findFirst({
        where: eq(plaidItems.id, id),
      });
      if (!stillThere) report.prunedItemIds.push(id);
    }
  }

  return report;
}

// Sync accounts from Plaid for a given item. `defaultOwner` (a username,
// e.g. "renato") is applied only when a NEW account is first created —
// existing accounts keep whatever owner assignment was already set.
export async function syncAccounts(
  plaidClient: PlaidApi,
  plaidItemId: string,
  accessToken: string,
  defaultOwner?: string
) {
  const plaidItem = await db.query.plaidItems.findFirst({
    where: eq(plaidItems.id, plaidItemId),
  });

  if (!plaidItem) {
    throw new Error("Plaid item not found");
  }

  try {
    // Fetch accounts from Plaid
    const response = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const plaidAccounts = response.data.accounts;

    // Accounts the household already has at this institution under an older
    // Plaid item. Loaded once per sync; each row can be adopted at most once.
    const adoptionPool = await loadAdoptionPool(plaidItem);
    const adopted = new Set<string>();
    const displacedItemIds = new Set<string>();
    const linkedAt = plaidItem.createdAt.getTime();

    // Upsert accounts into DB
    for (const plaidAccount of plaidAccounts) {
      const currentBalance = plaidAccount.balances.current?.toString() || "0";
      const accountData = {
        id: generateId(),
        plaidItemId,
        plaidAccountId: plaidAccount.account_id,
        name: plaidAccount.name,
        officialName: plaidAccount.official_name || null,
        mask: plaidAccount.mask || null,
        type: plaidAccount.type,
        subtype: plaidAccount.subtype || null,
        kind: deriveKind(plaidAccount.type),
        currentBalance,
        availableBalance: plaidAccount.balances.available?.toString() || null,
        currency: plaidAccount.balances.iso_currency_code || "USD",
        isActive: true,
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Upsert: check if exists, update balances if it does
      let existing = await db.query.accounts.findFirst({
        where: eq(accounts.plaidAccountId, plaidAccount.account_id),
      });

      // Not found by account_id — before creating a row, check whether this is
      // an account the household already has under an older item for the same
      // institution (a re-link). If so, adopt that row: move it onto this item
      // under the new account_id, keeping its owner, display name, icon and
      // every transaction already attached to it. Only an unambiguous match
      // (exactly one candidate) is adopted; anything else inserts as new.
      if (!existing) {
        const matches = findAdoptionCandidates(
          adoptionPool.rows.filter((c) => !adopted.has(c.id)),
          plaidAccount
        );
        if (matches.length > 1) {
          console.warn(
            `Ambiguous re-link match for Plaid account ${plaidAccount.account_id} ` +
              `(${plaidAccount.name}): ${matches.length} candidates — inserting as new.`
          );
        } else if (matches.length === 1) {
          const match = matches[0];
          const matchLinkedAt =
            adoptionPool.linkedAt.get(match.plaidItemId)?.getTime() ?? 0;

          if (matchLinkedAt > linkedAt) {
            // A newer link already owns this account. This item is the stale
            // one — leaving its copy alone would be harmless, but re-creating
            // it here is exactly the duplicate we're trying to stop, and
            // adopting it back would ping-pong the account on every sync.
            console.info(
              `Skipping Plaid account ${plaidAccount.account_id} (${plaidAccount.name}) — ` +
                `already linked through a newer item as account ${match.id}`
            );
            continue;
          }

          existing = match;
          adopted.add(existing.id);
          displacedItemIds.add(existing.plaidItemId);
          console.info(
            `Adopting existing account ${existing.id} (${existing.name}) into ` +
              `Plaid item ${plaidItemId} under new account_id ${plaidAccount.account_id}`
          );
        }
      }

      let accountId: string;
      if (existing) {
        const isAdoption = adopted.has(existing.id);
        accountId = existing.id;
        await db
          .update(accounts)
          .set({
            // Re-pointing these two is what makes adoption work; for an
            // account already on this item they're a no-op.
            plaidItemId,
            plaidAccountId: accountData.plaidAccountId,
            currentBalance: accountData.currentBalance,
            availableBalance: accountData.availableBalance,
            name: accountData.name,
            mask: accountData.mask,
            kind: accountData.kind,
            // An adopted account is by definition live again; never flip this
            // for an account that was already on this item.
            ...(isAdoption ? { isActive: true } : {}),
            lastSyncedAt: accountData.lastSyncedAt,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, existing.id));
      } else {
        accountId = accountData.id;
        await db.insert(accounts).values({
          ...accountData,
          ...(defaultOwner ? { owner: defaultOwner } : {}),
        });
      }

      // One snapshot per sync — "every time it refreshes, it saves that
      // balance at that time."
      await db.insert(accountBalanceHistory).values({
        id: generateId(),
        accountId,
        balance: currentBalance,
        recordedAt: new Date(),
      });
    }

    // Any older item we emptied out by adopting all of its accounts must go,
    // otherwise the next sync would pull those accounts back to it.
    if (displacedItemIds.size > 0) {
      await pruneEmptyPlaidItems(plaidClient, [...displacedItemIds]);
    }

    return plaidAccounts;
  } catch (error) {
    console.error("Failed to sync accounts:", error);
    throw error;
  }
}

// Sync transactions from Plaid for a given item (all linked accounts).
export async function syncTransactions(
  plaidClient: PlaidApi,
  plaidItemId: string,
  accessToken: string,
  userId?: string,
  days: number = 30
) {
  const plaidItem = await db.query.plaidItems.findFirst({
    where: eq(plaidItems.id, plaidItemId),
  });

  if (!plaidItem) {
    throw new Error("Plaid item not found");
  }

  const finalUserId = userId || plaidItem.userId;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    // Fetch transactions from Plaid
    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate.toISOString().split("T")[0],
      end_date: new Date().toISOString().split("T")[0],
      options: {
        include_personal_finance_category: true,
      },
    });

    const plaidTransactions = response.data.transactions;

    // Get all accounts for this item to map plaid account IDs
    const itemAccounts = await db.query.accounts.findMany({
      where: eq(accounts.plaidItemId, plaidItemId),
    });

    const accountMap = new Map(
      itemAccounts.map((acc) => [acc.plaidAccountId, acc.id])
    );

    // Bounds logo-caching cost to "number of distinct merchants in this
    // sync," not "number of transactions" — repeat merchants (Starbucks x20)
    // hit Plaid/Storage once per sync run, not once per transaction.
    const logoCache = new Map<string, string | null>();
    async function resolveMerchantLogo(key: string, sourceLogoUrl: string) {
      if (logoCache.has(key)) return logoCache.get(key)!;
      let url: string | null = null;
      try {
        url = await cacheMerchantLogo(key, sourceLogoUrl);
      } catch (err) {
        console.error(`Failed to cache merchant logo for ${key}:`, err);
      }
      logoCache.set(key, url);
      return url;
    }

    // Upsert transactions into DB
    for (const plaidTx of plaidTransactions) {
      const accountId = accountMap.get(plaidTx.account_id);
      if (!accountId) {
        console.warn(
          `Account ${plaidTx.account_id} not found for transaction ${plaidTx.transaction_id}`
        );
        continue;
      }

      const merchantKey =
        plaidTx.merchant_entity_id || (plaidTx.merchant_name ? slugifyMerchantKey(plaidTx.merchant_name) : null);
      const merchantLogoUrl =
        merchantKey && plaidTx.logo_url ? await resolveMerchantLogo(merchantKey, plaidTx.logo_url) : null;
      const pfc = plaidTx.personal_finance_category;

      // Plaid's amount convention: positive = money out (expense), negative =
      // money in (income/refund). We store the "friendly" flipped sign
      // instead — negative = expense, positive = income — since that's what
      // the spending/cash-flow queries and the dashboard widgets assume.
      const isExpense = plaidTx.amount > 0;
      const txData = {
        id: generateId(),
        accountId,
        categoryId: null,
        plaidTransactionId: plaidTx.transaction_id,
        name: plaidTx.name,
        merchant: plaidTx.merchant_name || null,
        merchantCleanedUp: null,
        merchantEntityId: merchantKey,
        merchantLogoUrl,
        pfcPrimary: pfc?.primary || null,
        pfcDetailed: pfc?.detailed || null,
        // Only applied on insert (see below) — never overwrites a user's
        // manual choice on an existing transaction during re-sync.
        transferType: mapPfcToTransferType(pfc?.primary, pfc?.detailed),
        amount: (-plaidTx.amount).toString(),
        type: (isExpense ? "debit" : "credit") as "debit" | "credit",
        date: new Date(plaidTx.date),
        pending: plaidTx.pending,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Upsert: check if exists, update if it does
      const existing = await db.query.transactions.findFirst({
        where: eq(transactions.plaidTransactionId, plaidTx.transaction_id),
      });

      if (existing) {
        await db
          .update(transactions)
          .set({
            name: txData.name,
            merchant: txData.merchant,
            merchantEntityId: txData.merchantEntityId,
            merchantLogoUrl: txData.merchantLogoUrl,
            pfcPrimary: txData.pfcPrimary,
            pfcDetailed: txData.pfcDetailed,
            amount: txData.amount,
            pending: txData.pending,
            date: txData.date,
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, existing.id));
      } else {
        const inserted = await db.insert(transactions).values(txData).returning();
        if (inserted.length > 0 && finalUserId) {
          await autoTagTransaction(finalUserId, inserted[0].id, plaidTx.merchant_name, pfc ?? undefined);
        }
      }
    }

    // Update lastSyncedAt on the plaidItem
    await db
      .update(plaidItems)
      .set({ lastSyncedAt: new Date() })
      .where(eq(plaidItems.id, plaidItemId));

    return plaidTransactions;
  } catch (error) {
    console.error("Failed to sync transactions:", error);
    throw error;
  }
}
