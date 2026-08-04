import {
  pgTable,
  text,
  varchar,
  numeric,
  timestamp,
  boolean,
  integer,
  pgEnum,
  uniqueIndex,
  foreignKey,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const transactionTypeEnum = pgEnum("transaction_type", [
  "debit",
  "credit",
]);

// Users table (shared login for two-user household)
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_users_email").on(table.email)]
);

// Plaid items (one per user; tracks item_id and access token)
export const plaidItems = pgTable(
  "plaid_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: varchar("item_id", { length: 255 }).notNull().unique(),
    accessToken: varchar("access_token", { length: 500 }).notNull(),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_plaid_items_user_id").on(table.userId),
    uniqueIndex("idx_plaid_items_item_id").on(table.itemId),
  ]
);

// Accounts (from Plaid; one household has many accounts across institutions)
export const accounts = pgTable(
  "accounts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    plaidItemId: varchar("plaid_item_id", { length: 36 })
      .notNull()
      .references(() => plaidItems.id, { onDelete: "cascade" }),
    plaidAccountId: varchar("plaid_account_id", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    officialName: varchar("official_name", { length: 255 }),
    type: varchar("type", { length: 50 }).notNull(), // "depository", "credit", "brokerage", etc.
    subtype: varchar("subtype", { length: 50 }), // "checking", "savings", "credit card", etc.
    currentBalance: numeric("current_balance", { precision: 16, scale: 2 }).notNull(),
    availableBalance: numeric("available_balance", { precision: 16, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_accounts_plaid_item_id").on(table.plaidItemId),
    uniqueIndex("idx_accounts_plaid_account_id").on(table.plaidAccountId),
  ]
);

// Categories (for tagging/filtering transactions)
export const categories = pgTable(
  "categories",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    color: varchar("color", { length: 7 }).default("#6366f1").notNull(), // hex color
    icon: varchar("icon", { length: 50 }).default("folder").notNull(), // lucide icon name
    isCustom: boolean("is_custom").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_categories_name").on(table.name)]
);

// Transactions (from Plaid; enriched with category and merchant cleanup)
export const transactions = pgTable(
  "transactions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    accountId: varchar("account_id", { length: 36 })
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: varchar("category_id", { length: 36 }).references(
      () => categories.id,
      { onDelete: "set null" }
    ),
    plaidTransactionId: varchar("plaid_transaction_id", {
      length: 255,
    }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    merchant: varchar("merchant", { length: 255 }),
    merchantCleanedUp: varchar("merchant_cleaned_up", { length: 255 }),
    amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
    type: transactionTypeEnum("type").notNull(),
    date: timestamp("date").notNull(),
    pending: boolean("pending").default(false).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_transactions_account_id").on(table.accountId),
    index("idx_transactions_category_id").on(table.categoryId),
    index("idx_transactions_date").on(table.date),
    uniqueIndex("idx_transactions_plaid_id").on(table.plaidTransactionId),
  ]
);

// Transaction splits (allow manual split of a transaction into multiple categories)
export const transactionSplits = pgTable(
  "transaction_splits",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    transactionId: varchar("transaction_id", { length: 36 })
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    categoryId: varchar("category_id", { length: 36 })
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_transaction_splits_transaction_id").on(table.transactionId),
    index("idx_transaction_splits_category_id").on(table.categoryId),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  plaidItems: many(plaidItems),
}));

export const plaidItemsRelations = relations(plaidItems, ({ one, many }) => ({
  user: one(users, {
    fields: [plaidItems.userId],
    references: [users.id],
  }),
  accounts: many(accounts),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  plaidItem: one(plaidItems, {
    fields: [accounts.plaidItemId],
    references: [plaidItems.id],
  }),
  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(
  transactions,
  ({ one, many }) => ({
    account: one(accounts, {
      fields: [transactions.accountId],
      references: [accounts.id],
    }),
    category: one(categories, {
      fields: [transactions.categoryId],
      references: [categories.id],
    }),
    splits: many(transactionSplits),
  })
);

export const transactionSplitsRelations = relations(
  transactionSplits,
  ({ one }) => ({
    transaction: one(transactions, {
      fields: [transactionSplits.transactionId],
      references: [transactions.id],
    }),
    category: one(categories, {
      fields: [transactionSplits.categoryId],
      references: [categories.id],
    }),
  })
);
