import { db } from './index';
import { users } from './schema';
import { sql } from 'drizzle-orm';
import { generateId } from '@/lib/id';

const emailMap = {
  renato: 'renatountalan@gmail.com',
  claudia: 'claudiapuente00@outlook.com',
};

async function injectSeedUsers() {
  console.log('💉 Injecting seed users...');

  try {
    for (const [username, email] of Object.entries(emailMap)) {
      // Upsert: update if exists (add email), insert if missing
      await db
        .insert(users)
        .values({
          id: generateId(),
          username,
          email,
          passwordHash: null, // Now optional
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
    console.log('✅ Seed users injection complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

injectSeedUsers();
