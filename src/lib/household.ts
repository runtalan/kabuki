import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { householdByUsername } from './households';

// Expands a user id into every user id that shares its household.
// For renato/claudia and mom/pop this expands to all household members;
// for anyone else (demo account, unaffiliated user) it's just themselves —
// never merged with real household data in either direction.
export async function getHouseholdUserIds(userId: string): Promise<string[]> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return [userId];

  const hh = householdByUsername(user.username);
  if (!hh) return [userId]; // demo or unaffiliated

  const householdUsers = await db.query.users.findMany({
    where: inArray(users.username, hh.usernames),
  });
  return householdUsers.map((u) => u.id);
}
