import { db } from './index';
import { users, categories, plaidItems, accounts, accountBalanceHistory, recurringSeries, holdings } from './schema';
import { eq, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { generateId } from '@/lib/id';
import { normalizeMerchant } from '@/lib/spending-insights';
import { getRecurringSpineForSeed } from '@/lib/demo-data';
import {
  DEMO_USERNAME,
  DEMO_PASSWORD,
  DEMO_USER_ID,
  DEMO_PLAID_ITEM_ID,
  DEMO_PLAID_ITEM_ITEM_ID,
  DEMO_CHECKING_ACCOUNT_ID,
  DEMO_CREDIT_ACCOUNT_ID,
  DEMO_SAVINGS_ACCOUNT_ID,
  DEMO_STARTING_BALANCES,
} from '@/lib/demo';

// Colors are all drawn from CATEGORY_COLORS (src/lib/category-colors.ts) so
// every default category shows up as a selected swatch — not just a hex
// value the picker doesn't otherwise offer — when a user opens edit on it.
const defaultCategories = [
  { name: 'Income', color: '#16a34a', icon: 'TrendingUp' },
  { name: 'Groceries', color: '#2563eb', icon: 'ShoppingCart' },
  { name: 'Dining', color: '#ea580c', icon: 'UtensilsCrossed' },
  { name: 'Transport', color: '#7c3aed', icon: 'Car' },
  { name: 'Shopping', color: '#ca8a04', icon: 'ShoppingBag' },
  { name: 'Utilities', color: '#0891b2', icon: 'Zap' },
  { name: 'Entertainment', color: '#c026d3', icon: 'Popcorn' },
  { name: 'Healthcare', color: '#e11d48', icon: 'Heart' },
  { name: 'Education', color: '#4f46e5', icon: 'BookOpen' },
  { name: 'Transfer', color: '#475569', icon: 'ArrowLeftRight' },
  { name: 'Bills', color: '#92400e', icon: 'FileText' },
  { name: 'Fitness', color: '#059669', icon: 'Activity' },
  { name: 'Travel', color: '#0d9488', icon: 'Plane' },
  { name: 'Subscription', color: '#9333ea', icon: 'Clock' },
];

async function seed() {
  console.log('🌱 Seeding database...');

  // Hash passwords
  const passwordHash = await bcrypt.hash('br0wnC0wb1!', 10);

  const rentoId = generateId();
  const claudiaId = generateId();

  // Upsert users — never delete (cascades would wipe linked Plaid items)
  try {
    await db
      .insert(users)
      .values([
        {
          id: rentoId,
          username: 'renato',
          passwordHash: passwordHash,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: claudiaId,
          username: 'claudia',
          passwordHash: passwordHash,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      .onConflictDoNothing({ target: users.username });
    console.log('✓ Users ensured (renato, claudia)');
  } catch (error) {
    console.error('Error creating users:', error);
  }

  // Create categories (skip any that already exist)
  try {
    await db
      .insert(categories)
      .values(
        defaultCategories.map((cat) => ({
          id: generateId(),
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          isCustom: false,
          createdAt: new Date(),
        }))
      )
      .onConflictDoNothing({ target: categories.name });
    console.log('✓ Categories ensured');
  } catch (error) {
    console.error('Error creating categories:', error);
  }

  // Shared, view-only public demo account. Idempotent like everything above
  // — safe to re-run against an already-seeded database.
  try {
    const demoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    await db
      .insert(users)
      .values({
        id: DEMO_USER_ID,
        username: DEMO_USERNAME,
        passwordHash: demoPasswordHash,
        isDemo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing({ target: users.username });

    await db
      .insert(plaidItems)
      .values({
        id: DEMO_PLAID_ITEM_ID,
        userId: DEMO_USER_ID,
        itemId: DEMO_PLAID_ITEM_ITEM_ID,
        accessToken: 'demo',
        institutionName: 'Demo Bank',
        isManual: true,
        lastSyncedAt: null, // null = never generated, triggers first full backfill
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing({ target: plaidItems.itemId });

    await db
      .insert(accounts)
      .values([
        {
          id: DEMO_CHECKING_ACCOUNT_ID,
          plaidItemId: DEMO_PLAID_ITEM_ID,
          plaidAccountId: DEMO_CHECKING_ACCOUNT_ID,
          name: 'Demo Checking',
          owner: 'joint',
          type: 'depository',
          subtype: 'checking',
          kind: 'asset',
          isManual: true,
          currentBalance: DEMO_STARTING_BALANCES[DEMO_CHECKING_ACCOUNT_ID].toFixed(2),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: DEMO_CREDIT_ACCOUNT_ID,
          plaidItemId: DEMO_PLAID_ITEM_ID,
          plaidAccountId: DEMO_CREDIT_ACCOUNT_ID,
          name: 'Demo Credit Card',
          owner: 'joint',
          type: 'credit',
          subtype: 'credit card',
          kind: 'liability',
          isManual: true,
          currentBalance: DEMO_STARTING_BALANCES[DEMO_CREDIT_ACCOUNT_ID].toFixed(2),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: DEMO_SAVINGS_ACCOUNT_ID,
          plaidItemId: DEMO_PLAID_ITEM_ID,
          plaidAccountId: DEMO_SAVINGS_ACCOUNT_ID,
          name: 'Demo Savings',
          owner: 'joint',
          type: 'depository',
          subtype: 'savings',
          kind: 'asset',
          isManual: true,
          currentBalance: DEMO_STARTING_BALANCES[DEMO_SAVINGS_ACCOUNT_ID].toFixed(2),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      .onConflictDoNothing({ target: accounts.plaidAccountId });

    // Pre-confirm the recurring "spine" — demo is view-only, so no visitor
    // can ever perform the confirm step the real review queue requires.
    // Without this, every spine entry would sit unconfirmed forever,
    // excluded from totals/calendar/summary (see DATABASE.md 0012 / the
    // recurring-summary bug fix this mirrors).
    const categoryRows = await db.query.categories.findMany();
    const categoryIdByName = new Map(categoryRows.map((c) => [c.name, c.id]));
    const spine = getRecurringSpineForSeed();
    await db
      .insert(recurringSeries)
      .values(
        spine.map((entry) => ({
          id: `demo-rec-${normalizeMerchant(entry.merchant).replace(/\s+/g, '-')}`,
          userId: DEMO_USER_ID,
          merchantKey: normalizeMerchant(entry.merchant),
          merchantName: entry.merchant,
          status: 'confirmed',
          isManual: false,
          frequency: entry.frequency,
          amount: entry.amount.toFixed(2),
          categoryId: categoryIdByName.get(entry.categoryName) ?? null,
          isIncome: entry.isIncome,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      )
      .onConflictDoNothing({ target: [recurringSeries.userId, recurringSeries.merchantKey] });

    console.log('✓ Demo account ensured (demo)');
  } catch (error) {
    console.error('Error creating demo account:', error);
  }

  // Household manual accounts (Renato & Claudia): checking/savings/credit
  // cards per user plus a joint auto loan, with 6 months of gently-trending
  // balance history so charts aren't empty on first load. Additive-only —
  // idempotent, safe to re-run.
  try {
    // rentoId/claudiaId above are freshly generated on every run of seed(),
    // but the users insert above is onConflictDoNothing keyed on username —
    // so on a re-run against an already-seeded database those local
    // variables won't match the *actual* stored user ids, and any FK insert
    // against them would violate the users FK constraint. Resolve the real
    // ids by joining accounts.owner -> plaid_items.user_id (never touching
    // the users table itself), falling back to the freshly generated id only
    // for a genuinely fresh database where no such account exists yet.
    async function resolveRealUserId(fallbackId: string, owner: 'renato' | 'claudia'): Promise<string> {
      const [row] = await db
        .select({ userId: plaidItems.userId })
        .from(accounts)
        .innerJoin(plaidItems, eq(plaidItems.id, accounts.plaidItemId))
        .where(eq(accounts.owner, owner))
        .limit(1);
      return row?.userId ?? fallbackId;
    }

    const realRentoId = await resolveRealUserId(rentoId, 'renato');
    const realClaudiaId = await resolveRealUserId(claudiaId, 'claudia');

    const renatoManualItemId = generateId();
    const claudiaManualItemId = generateId();

    await db
      .insert(plaidItems)
      .values([
        {
          id: renatoManualItemId,
          userId: realRentoId,
          itemId: `manual-${realRentoId}`,
          accessToken: 'manual',
          institutionName: 'Manual Accounts',
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: claudiaManualItemId,
          userId: realClaudiaId,
          itemId: `manual-${realClaudiaId}`,
          accessToken: 'manual',
          institutionName: 'Manual Accounts',
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      .onConflictDoNothing({ target: plaidItems.itemId });

    // The insert above may have no-op'd on conflict (itemId already exists
    // from a prior seed run), leaving the freshly generated *ManualItemId
    // dangling with no matching row. Resolve the actual stored plaid_items.id
    // so the accounts FK below is always valid.
    const [renatoItemRow] = await db
      .select({ id: plaidItems.id })
      .from(plaidItems)
      .where(eq(plaidItems.itemId, `manual-${realRentoId}`))
      .limit(1);
    const [claudiaItemRow] = await db
      .select({ id: plaidItems.id })
      .from(plaidItems)
      .where(eq(plaidItems.itemId, `manual-${realClaudiaId}`))
      .limit(1);
    const realRenatoManualItemId = renatoItemRow?.id ?? renatoManualItemId;
    const realClaudiaManualItemId = claudiaItemRow?.id ?? claudiaManualItemId;

    const householdAccounts = [
      { id: 'seed-acct-renato-checking', plaidItemId: realRenatoManualItemId, name: 'Renato Checking', owner: 'renato', type: 'depository', subtype: 'checking', kind: 'asset', balance: 6200 },
      { id: 'seed-acct-renato-savings', plaidItemId: realRenatoManualItemId, name: 'Renato Savings', owner: 'renato', type: 'depository', subtype: 'savings', kind: 'asset', balance: 4800 },
      { id: 'seed-acct-claudia-checking', plaidItemId: realClaudiaManualItemId, name: 'Claudia Checking', owner: 'claudia', type: 'depository', subtype: 'checking', kind: 'asset', balance: 4100 },
      { id: 'seed-acct-claudia-savings', plaidItemId: realClaudiaManualItemId, name: 'Claudia Savings', owner: 'claudia', type: 'depository', subtype: 'savings', kind: 'asset', balance: 3300 },
      { id: 'seed-acct-renato-credit', plaidItemId: realRenatoManualItemId, name: 'Renato Credit Card', owner: 'renato', type: 'credit', subtype: 'credit card', kind: 'liability', liabilityType: 'credit_card', balance: -1850 },
      { id: 'seed-acct-claudia-credit', plaidItemId: realClaudiaManualItemId, name: 'Claudia Credit Card', owner: 'claudia', type: 'credit', subtype: 'credit card', kind: 'liability', liabilityType: 'credit_card', balance: -1350 },
      { id: 'seed-acct-auto-loan', plaidItemId: realRenatoManualItemId, name: 'Auto Loan', owner: 'joint', type: 'loan', subtype: 'auto', kind: 'liability', liabilityType: 'other', balance: -14500 },
    ] as const;

    await db
      .insert(accounts)
      .values(
        householdAccounts.map((a) => ({
          id: a.id,
          plaidItemId: a.plaidItemId,
          plaidAccountId: a.id,
          name: a.name,
          owner: a.owner,
          type: a.type,
          subtype: a.subtype,
          kind: a.kind,
          liabilityType: 'liabilityType' in a ? a.liabilityType : null,
          isManual: true,
          currentBalance: a.balance.toFixed(2),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      )
      .onConflictDoNothing({ target: accounts.plaidAccountId });

    // 6 months of gently-trending balance history so every account chart has
    // data on first load. Cleared and re-inserted per run (there's no unique
    // constraint on this table to hang onConflictDoNothing off of) so re-running
    // the seed never duplicates history rows.
    const accountIds = householdAccounts.map((a) => a.id);
    await db.delete(accountBalanceHistory).where(inArray(accountBalanceHistory.accountId, accountIds));

    const now = new Date();
    const historyRows: { id: string; accountId: string; balance: string; recordedAt: Date }[] = [];
    for (const acct of householdAccounts) {
      for (let monthsAgo = 6; monthsAgo >= 0; monthsAgo--) {
        const recordedAt = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 15);
        // Liabilities trend slightly down (being paid off); assets trend slightly up (saving).
        const drift = acct.kind === 'liability' ? monthsAgo * 0.015 : -monthsAgo * 0.02;
        const balance = acct.balance * (1 + drift);
        historyRows.push({
          id: generateId(),
          accountId: acct.id,
          balance: balance.toFixed(2),
          recordedAt,
        });
      }
    }
    await db.insert(accountBalanceHistory).values(historyRows);

    console.log('✓ Household manual accounts + 6mo balance history ensured (renato, claudia)');
  } catch (error) {
    console.error('Error creating household accounts:', error);
  }

  // Joint investment brokerage account with VTI/VXUS/BND holdings (~$42k
  // total). Task 16's renatoManualItemId is scoped to its own try block, so
  // the shared manual plaid_item id is resolved here by reading it back off
  // an already-seeded account row instead (accounts-only lookup — never
  // touches users). Additive-only — idempotent, safe to re-run.
  try {
    const [renatoCheckingRow] = await db
      .select({ plaidItemId: accounts.plaidItemId })
      .from(accounts)
      .where(eq(accounts.id, 'seed-acct-renato-checking'))
      .limit(1);
    if (!renatoCheckingRow) {
      throw new Error(
        "seed-acct-renato-checking not found — Task 16's household accounts block must run first"
      );
    }
    const sharedManualItemId = renatoCheckingRow.plaidItemId;

    const brokerageAccountId = 'seed-acct-brokerage';
    await db
      .insert(accounts)
      .values({
        id: brokerageAccountId,
        plaidItemId: sharedManualItemId,
        plaidAccountId: brokerageAccountId,
        name: 'Joint Brokerage',
        owner: 'joint',
        type: 'brokerage',
        subtype: 'brokerage',
        kind: 'asset',
        isManual: true,
        currentBalance: '42062.60',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing({ target: accounts.plaidAccountId });

    // Share counts chosen so shares * currentPrice sums to ~$42,063, split
    // roughly 55% VTI / 20% VXUS / 25% BND by value:
    //   VTI:  81 * 285.50 = 23,125.50  (55.0%)
    //   VXUS: 135 * 62.30 =  8,410.50  (20.0%)
    //   BND:  146 * 72.10 = 10,526.60  (25.0%)
    //   total = 42,062.60
    const holdingsSeed = [
      { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', assetClass: 'us_stock', shares: 81, costBasis: 15800, currentPrice: 285.5 },
      { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', assetClass: 'intl_stock', shares: 135, costBasis: 6900, currentPrice: 62.3 },
      { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', assetClass: 'bond', shares: 146, costBasis: 10600, currentPrice: 72.1 },
    ];

    // holdings has no unique constraint to hang onConflictDoNothing off of
    // (only an index on account_id), so — matching Task 16's precedent for
    // accountBalanceHistory — clear and re-insert scoped to this account id
    // on every run.
    await db.delete(holdings).where(eq(holdings.accountId, brokerageAccountId));
    await db.insert(holdings).values(
      holdingsSeed.map((h) => ({
        id: generateId(),
        accountId: brokerageAccountId,
        symbol: h.symbol,
        name: h.name,
        assetClass: h.assetClass,
        shares: h.shares.toFixed(4),
        costBasis: h.costBasis.toFixed(2),
        currentPrice: h.currentPrice.toFixed(4),
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    );

    // 6 months of gently-rising portfolio value so the brokerage account
    // chart isn't empty on first load. Same clear-and-reinsert idempotency
    // pattern as above.
    await db.delete(accountBalanceHistory).where(eq(accountBalanceHistory.accountId, brokerageAccountId));
    const now = new Date();
    const brokerageHistory: { id: string; accountId: string; balance: string; recordedAt: Date }[] = [];
    for (let monthsAgo = 6; monthsAgo >= 0; monthsAgo--) {
      const recordedAt = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 15);
      const balance = 42062.6 * (1 - monthsAgo * 0.015);
      brokerageHistory.push({ id: generateId(), accountId: brokerageAccountId, balance: balance.toFixed(2), recordedAt });
    }
    await db.insert(accountBalanceHistory).values(brokerageHistory);

    console.log('✓ Investment brokerage account + holdings ensured');
  } catch (error) {
    console.error('Error creating investment holdings:', error);
  }

  console.log('✅ Seed complete!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
