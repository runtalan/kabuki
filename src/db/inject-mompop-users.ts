import { db } from './index';
import { users, categories } from './schema';
import { sql } from 'drizzle-orm';
import { generateId } from '@/lib/id';

const emailMap = {
  mom: 'ellie.untalan@yahoo.com',
  pop: 'nummuber33@hotmail.com',
};

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

async function injectMomPop() {
  console.log('💉 Injecting Mom & Pop users...');

  try {
    // Create mom and pop user rows
    for (const [username, email] of Object.entries(emailMap)) {
      await db
        .insert(users)
        .values({
          id: generateId(),
          username,
          email,
          passwordHash: null,
          isDemo: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: users.username,
          set: {
            email: sql`excluded.email`,
            updatedAt: new Date(),
          },
        });
      console.log(`✓ User ensured: ${username} (${email})`);
    }

    // Create default categories for mom-pop household
    await db
      .insert(categories)
      .values(
        defaultCategories.map((cat) => ({
          id: generateId(),
          householdSlug: 'mom-pop',
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          isCustom: false,
          createdAt: new Date(),
        }))
      )
      .onConflictDoNothing({ target: [categories.householdSlug, categories.name] });
    console.log('✓ Default categories created for mom-pop household');

    console.log('✅ Mom & Pop injection complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

injectMomPop();
