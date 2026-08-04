import { db } from './index';
import { users } from './schema';
import bcrypt from 'bcryptjs';
import { generateId } from '@/lib/id';

async function injectUser() {
  console.log('💉 Injecting user...');

  try {
    const passwordHash = await bcrypt.hash('password', 10);
    console.log('✓ Password hashed');

    const userId = generateId();
    console.log('✓ Generated ID:', userId);

    const result = await db.insert(users).values({
      id: userId,
      username: 'renato',
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✓ User created: renato / password');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

injectUser();
