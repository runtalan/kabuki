import { db } from './index';
import { users, categories } from './schema';
import bcrypt from 'bcryptjs';
import { generateId } from '@/lib/id';

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
  const passwordHash = await bcrypt.hash('password', 10);

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

  console.log('✅ Seed complete!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
