import { db } from "@/db";
import {
  accounts,
  plaidItems,
  transactions,
  transactionTypeEnum,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { plaidClient } from "./plaid";
import { generateId } from "./id";

// Sync accounts from Plaid for a given item.
export async function syncAccounts(
  plaidItemId: string,
  accessToken: string
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
      const accountData = {
        id: generateId(),
        plaidItemId,
        plaidAccountId: plaidAccount.account_id,
        name: plaidAccount.name,
        officialName: plaidAccount.official_name || null,
        type: plaidAccount.type,
        subtype: plaidAccount.subtype || null,
        currentBalance: plaidAccount.balances.current?.toString() || "0",
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

      if (existing) {
        await db
          .update(accounts)
          .set({
            currentBalance: accountData.currentBalance,
            availableBalance: accountData.availableBalance,
            name: accountData.name,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, existing.id));
      } else {
        await db.insert(accounts).values(accountData);
      }
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
  days: number = 30
) {
  const plaidItem = await db.query.plaidItems.findFirst({
    where: eq(plaidItems.id, plaidItemId),
  });

  if (!plaidItem) {
    throw new Error("Plaid item not found");
  }

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

      const txData = {
        id: generateId(),
        accountId,
        categoryId: null,
        plaidTransactionId: plaidTx.transaction_id,
        name: plaidTx.name,
        merchant: plaidTx.merchant_name || null,
        merchantCleanedUp: null,
        amount: plaidTx.amount.toString(),
        type: (plaidTx.amount < 0 ? "debit" : "credit") as "debit" | "credit",
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
        await db.insert(transactions).values(txData);
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
