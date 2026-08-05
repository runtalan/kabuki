import { db } from "@/db";
import {
  accounts,
  accountBalanceHistory,
  plaidItems,
  transactions,
  transactionTypeEnum,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { plaidClient } from "./plaid";
import { generateId } from "./id";
import { autoTagTransaction } from "./auto-tag";

// Plaid's own account.type — 'credit' and 'loan' carry a balance you owe,
// everything else (depository, investment, brokerage) is an asset.
function deriveKind(plaidType: string): "asset" | "liability" {
  return plaidType === "credit" || plaidType === "loan" ? "liability" : "asset";
}

// Sync accounts from Plaid for a given item. `defaultOwner` (a username,
// e.g. "renato") is applied only when a NEW account is first created —
// existing accounts keep whatever owner assignment was already set.
export async function syncAccounts(
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
    const accountBalances = response.data.accounts;

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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Upsert: check if exists, update balances if it does
      const existing = await db.query.accounts.findFirst({
        where: eq(accounts.plaidAccountId, plaidAccount.account_id),
      });

      let accountId: string;
      if (existing) {
        accountId = existing.id;
        await db
          .update(accounts)
          .set({
            currentBalance: accountData.currentBalance,
            availableBalance: accountData.availableBalance,
            name: accountData.name,
            mask: accountData.mask,
            kind: accountData.kind,
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

    return plaidAccounts;
  } catch (error) {
    console.error("Failed to sync accounts:", error);
    throw error;
  }
}

// Sync transactions from Plaid for a given item (all linked accounts).
export async function syncTransactions(
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

    // Upsert transactions into DB
    for (const plaidTx of plaidTransactions) {
      const accountId = accountMap.get(plaidTx.account_id);
      if (!accountId) {
        console.warn(
          `Account ${plaidTx.account_id} not found for transaction ${plaidTx.transaction_id}`
        );
        continue;
      }

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
            amount: txData.amount,
            pending: txData.pending,
            date: txData.date,
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, existing.id));
      } else {
        const inserted = await db.insert(transactions).values(txData).returning();
        if (inserted.length > 0 && finalUserId) {
          await autoTagTransaction(finalUserId, inserted[0].id, plaidTx.merchant_name);
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
