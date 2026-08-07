import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getHouseholdUserIds } from "./household";
import { refreshMonthlyBalances } from "./monthly-balance";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  isDemo: boolean;
  householdUserIds: string[];
}

export interface AuthSession {
  user?: AuthUser & { id?: string };
}

// Get the authenticated user from the session, resolved against the database.
// The JWT can hold a stale user ID (e.g. after a reseed), so we always look up
// the canonical row by email. Returns null if not authenticated or not found.
export async function getUser(): Promise<AuthUser | null> {
  const session = (await auth()) as AuthSession | null;
  if (!session?.user?.email) {
    console.debug("[getUser] No session or email:", { session: session ? { user: session.user } : null });
    return null;
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
  });

  if (!dbUser) {
    console.debug("[getUser] User not found in DB:", { email: session.user.email });
    return null;
  }

  try {
    await refreshMonthlyBalances(dbUser.id);
  } catch (error) {
    // Never let a balance-refresh failure break auth resolution — this is a
    // side effect of login, not core to it.
    console.error("[getUser] refreshMonthlyBalances failed:", error);
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    username: dbUser.username,
    isDemo: dbUser.isDemo,
    householdUserIds: await getHouseholdUserIds(dbUser.id),
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

// The shared demo account is view-only. Call this right after the existing
// getUser()/401 check in every mutating API route (POST/PATCH/PUT/DELETE)
// and return its result immediately if non-null.
export function assertWriteAccess(user: AuthUser): Response | null {
  if (user.isDemo) {
    return Response.json({ error: "Demo account is view-only" }, { status: 403 });
  }
  return null;
}
