import { db } from './index';
import { users, categories, plaidItems, accounts, recurringSeries } from './schema';
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

const defaultCategories = [
  { name: 'Income', color: '#10b981', icon: 'TrendingUp' },
  { name: 'Groceries', color: '#3b82f6', icon: 'ShoppingCart' },
  { name: 'Dining', color: '#ef4444', icon: 'UtensilsCrossed' },
  { name: 'Transport', color: '#8b5cf6', icon: 'Car' },
  { name: 'Shopping', color: '#f59e0b', icon: 'ShoppingBag' },
  { name: 'Utilities', color: '#06b6d4', icon: 'Zap' },
  { name: 'Entertainment', color: '#ec4899', icon: 'Popcorn' },
  { name: 'Healthcare', color: '#f87171', icon: 'Heart' },
  { name: 'Education', color: '#6366f1', icon: 'BookOpen' },
  { name: 'Transfer', color: '#6b7280', icon: 'ArrowLeftRight' },
  { name: 'Bills', color: '#a78bfa', icon: 'FileText' },
  { name: 'Fitness', color: '#34d399', icon: 'Activity' },
  { name: 'Travel', color: '#fbbf24', icon: 'Plane' },
  { name: 'Subscription', color: '#818cf8', icon: 'Clock' },
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

  console.log('✅ Seed complete!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
