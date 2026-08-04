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
  { name: 'Utilities', color: '#10b981', icon: 'Zap' },
  { name: 'Entertainment', color: '#ec4899', icon: 'Popcorn' },
  { name: 'Healthcare', color: '#06b6d4', icon: 'Heart' },
  { name: 'Education', color: '#6366f1', icon: 'BookOpen' },
  { name: 'Transfer', color: '#6b7280', icon: 'ArrowLeftRight' },
];

export async function seed() {
  console.log('🌱 Seeding database...');

  // Hash passwords
  const password1 = await bcrypt.hash('password', 10);
  const password2 = await bcrypt.hash('password', 10);

  const userId1 = generateId();
  const userId2 = generateId();

  // Create users
  try {
    await db.insert(users).values([
      {
        id: userId1,
        email: 'user1@example.com',
        passwordHash: password1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: userId2,
        email: 'user2@example.com',
        passwordHash: password2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    console.log('✓ Users created');
  } catch (error) {
    console.log('⚠ Users already exist or error occurred');
  }

  // Create categories
  try {
    await db.insert(categories).values(
      defaultCategories.map((cat) => ({
        id: generateId(),
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        isCustom: false,
        createdAt: new Date(),
      }))
    );
    console.log('✓ Categories created');
  } catch (error) {
    console.log('⚠ Categories already exist or error occurred');
  }

  console.log('✅ Seed complete!');
}
