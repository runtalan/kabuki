import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

// The two real household logins. `demo` and any future non-household user
// are deliberately excluded — they stay isolated to just themselves.
export const HOUSEHOLD_USERNAMES: readonly string[] = ['renato', 'claudia'];

// Expands a user id into every user id that shares its household. For
// renato/claudia this is always both of them (so either login sees the
// full shared financial picture); for anyone else (the demo account, or a
// future non-household user) it's just themselves — never merged with real
// household data in either direction.
export async function getHouseholdUserIds(userId: string): Promise<string[]> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || !HOUSEHOLD_USERNAMES.includes(user.username)) {
    return [userId];
  }

  const householdUsers = await db.query.users.findMany({
    where: inArray(users.username, HOUSEHOLD_USERNAMES),
  });
  return householdUsers.map((u) => u.id);
}
