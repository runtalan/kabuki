import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  user?: AuthUser & { id?: string };
}

// Get the authenticated user from the session, resolved against the database.
// The JWT can hold a stale user ID (e.g. after a reseed), so we always look up
// the canonical row by username. Returns null if not authenticated or not found.
export async function getUser(): Promise<AuthUser | null> {
  const session = (await auth()) as AuthSession | null;
  if (!session?.user?.email) {
    return null;
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.username, session.user.email),
  });

  if (!dbUser) {
    return null;
  }

  return {
    id: dbUser.id,
    email: dbUser.username,
  };
}

// Require authentication; throw if not authenticated.
export async function requireUser(): Promise<AuthUser> {
  const user = await getUser();
  if (!user || !user.id) {
    throw new Error("Unauthorized");
  }
  return user;
}
