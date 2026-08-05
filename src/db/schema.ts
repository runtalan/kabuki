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
    username: varchar("username", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    // Shared, view-only public demo account — never a real household user.
    isDemo: boolean("is_demo").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_users_username").on(table.username)]
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
    institutionName: varchar("institution_name", { length: 255 }),
    institutionId: varchar("institution_id", { length: 255 }),
    institutionLogoUrl: text("institution_logo_url"),
    lastSyncedAt: timestamp("last_synced_at"),
    syncStatus: varchar("sync_status", { length: 20 }).default("idle").notNull(), // "idle", "syncing", "error"
    lastError: text("last_error"),
    isManual: boolean("is_manual").default(false).notNull(), // synthetic container for manually-added accounts
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
    mask: varchar("mask", { length: 10 }), // last 4 digits of the account number, from Plaid
    displayName: varchar("display_name", { length: 255 }), // user-customized name
    icon: varchar("icon", { length: 50 }), // lucide icon name
    owner: varchar("owner", { length: 20 }).default("joint").notNull(), // "renato" | "claudia" | "joint"
    type: varchar("type", { length: 50 }).notNull(), // "depository", "credit", "brokerage", "manual", etc.
    subtype: varchar("subtype", { length: 50 }), // "checking", "savings", "credit card", etc.
    kind: varchar("kind", { length: 10 }).default("asset").notNull(), // "asset" | "liability" — sign for net worth
    liabilityType: varchar("liability_type", { length: 30 }), // "credit_card" | "student_loan" | "mortgage" | "personal_loan" | "other"
    assetType: varchar("asset_type", { length: 30 }), // "car" | "property" | "other" — manual assets only
    address: varchar("address", { length: 500 }), // manual property assets only
    isManual: boolean("is_manual").default(false).notNull(),
    currentBalance: numeric("current_balance", { precision: 16, scale: 2 }).notNull(),
    availableBalance: numeric("available_balance", { precision: 16, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_accounts_plaid_item_id").on(table.plaidItemId),
    uniqueIndex("idx_accounts_plaid_account_id").on(table.plaidAccountId),
  ]
);

// Historical balance snapshots — one row per sync (or manual edit) so each
// account can render a real over-time line chart instead of an approximation.
export const accountBalanceHistory = pgTable(
  "account_balance_history",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    accountId: varchar("account_id", { length: 36 })
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    balance: numeric("balance", { precision: 16, scale: 2 }).notNull(),
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_balance_history_account_id").on(table.accountId),
    index("idx_balance_history_recorded_at").on(table.recordedAt),
  ]
);

// Categories (for tagging/filtering transactions)
export const categories = pgTable(
  "categories",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    color: varchar("color", { length: 7 }).default("#6366f1").notNull(),
    icon: varchar("icon", { length: 50 }).default("folder").notNull(),
    isCustom: boolean("is_custom").default(false).notNull(),
    // Monthly budget limit for this category; null = no budget set
    monthlyBudget: numeric("monthly_budget", { precision: 12, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_categories_name").on(table.name)]
);

// Auto-tagging rules
export const rules = pgTable(
  "rules",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: varchar("category_id", { length: 36 })
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    merchantName: varchar("merchant_name", { length: 255 }).notNull(),
    matchType: varchar("match_type", { length: 20 }).default("contains").notNull(), // "exact", "contains", "startsWith"
    enabled: boolean("enabled").default(true).notNull(),
    priority: integer("priority").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_rules_user_id").on(table.userId),
    index("idx_rules_category_id").on(table.categoryId),
    index("idx_rules_merchant_name").on(table.merchantName),
  ]
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
    // Provenance of categoryId — governs override precedence: manual > rule > smart
    categorySource: varchar("category_source", { length: 10 }),
    // Per-transaction owner override — falls back to the account's owner
    // when null (e.g. a joint account but this one purchase was Renato's).
    ownerOverride: varchar("owner_override", { length: 20 }),
    plaidTransactionId: varchar("plaid_transaction_id", {
      length: 255,
    }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    merchant: varchar("merchant", { length: 255 }),
    merchantCleanedUp: varchar("merchant_cleaned_up", { length: 255 }),
    // Plaid's stable per-merchant key (shared across all transactions at the
    // same merchant) — used to dedupe logo caching the same way
    // plaidItems.institutionId dedupes institution logos.
    merchantEntityId: varchar("merchant_entity_id", { length: 255 }),
    merchantLogoUrl: text("merchant_logo_url"),
    // Plaid's personal_finance_category (already requested via
    // include_personal_finance_category on every sync) — the primary/only
    // categorization signal from Plaid itself, mapped to our own categories
    // as the top tier of "smart" tagging. See lib/smart-categorize.ts.
    pfcPrimary: varchar("pfc_primary", { length: 50 }),
    pfcDetailed: varchar("pfc_detailed", { length: 50 }),
    amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
    type: transactionTypeEnum("type").notNull(),
    date: timestamp("date").notNull(),
    pending: boolean("pending").default(false).notNull(),
    // Hidden transactions are excluded from spending totals, budgets, and
    // reports but remain visible (dimmed) in the raw transaction list.
    hidden: boolean("hidden").default(false).notNull(),
    // Null = a normal income/expense transaction. "transfer" or
    // "credit_card_payment" = money moving between the household's own
    // accounts (e.g. checking -> credit card) — excluded from income,
    // expense, cash-flow, and budget totals the same way `hidden` is, so a
    // credit card payment isn't counted as spend on top of the purchases
    // that already hit the card. Auto-set from Plaid's personal_finance_category
    // at sync time (see lib/plaid-sync.ts); user-editable in the transaction
    // detail panel.
    transferType: varchar("transfer_type", { length: 20 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_transactions_account_id").on(table.accountId),
    index("idx_transactions_category_id").on(table.categoryId),
    index("idx_transactions_date").on(table.date),
    index("idx_transactions_merchant_entity_id").on(table.merchantEntityId),
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

// Freeform tags — cross-cutting labels like "Coachella" or "Wedding" that
// aren't tied to a spending category, so a trip's flights (Travel),
// restaurants (Dining), and merch (Shopping) can still be summed together.
export const tags = pgTable(
  "tags",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    color: varchar("color", { length: 7 }).default("#6366f1").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_tags_name").on(table.name)]
);

// Many-to-many join: a transaction can carry several tags, a tag spans many transactions.
export const transactionTags = pgTable(
  "transaction_tags",
  {
    transactionId: varchar("transaction_id", { length: 36 })
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    tagId: varchar("tag_id", { length: 36 })
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("idx_transaction_tags_unique").on(table.transactionId, table.tagId),
    index("idx_transaction_tags_transaction_id").on(table.transactionId),
    index("idx_transaction_tags_tag_id").on(table.tagId),
  ]
);

// Recurring series — user decisions layered on top of heuristic detection,
// plus fully manual entries. A detected series with no row here is active but
// still sitting in the "is this recurring?" review queue; 'confirmed' clears it
// from the queue, 'dismissed' hides it everywhere.
export const recurringSeries = pgTable(
  "recurring_series",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Normalized merchant string — the join key back to detected series.
    merchantKey: varchar("merchant_key", { length: 255 }).notNull(),
    merchantName: varchar("merchant_name", { length: 255 }).notNull(),
    status: varchar("status", { length: 20 }).default("confirmed").notNull(), // "confirmed" | "dismissed"
    isManual: boolean("is_manual").default(false).notNull(),
    // Populated for manual entries; for detected series these override detection.
    frequency: varchar("frequency", { length: 20 }), // weekly | biweekly | monthly | yearly
    amount: numeric("amount", { precision: 16, scale: 2 }),
    categoryId: varchar("category_id", { length: 36 }).references(
      () => categories.id,
      { onDelete: "set null" }
    ),
    nextDate: timestamp("next_date"),
    isIncome: boolean("is_income").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_recurring_series_user_merchant").on(
      table.userId,
      table.merchantKey
    ),
    index("idx_recurring_series_user_id").on(table.userId),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  plaidItems: many(plaidItems),
  recurringSeries: many(recurringSeries),
}));

export const recurringSeriesRelations = relations(recurringSeries, ({ one }) => ({
  user: one(users, {
    fields: [recurringSeries.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [recurringSeries.categoryId],
    references: [categories.id],
  }),
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
  balanceHistory: many(accountBalanceHistory),
}));

export const accountBalanceHistoryRelations = relations(
  accountBalanceHistory,
  ({ one }) => ({
    account: one(accounts, {
      fields: [accountBalanceHistory.accountId],
      references: [accounts.id],
    }),
  })
);

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
    tags: many(transactionTags),
  })
);

export const tagsRelations = relations(tags, ({ many }) => ({
  transactions: many(transactionTags),
}));

export const transactionTagsRelations = relations(transactionTags, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionTags.transactionId],
    references: [transactions.id],
  }),
  tag: one(tags, {
    fields: [transactionTags.tagId],
    references: [tags.id],
  }),
}));

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

export const rulesRelations = relations(rules, ({ one }) => ({
  user: one(users, {
    fields: [rules.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [rules.categoryId],
    references: [categories.id],
  }),
}));
