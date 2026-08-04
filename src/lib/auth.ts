import { auth } from "@/auth";

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  user?: AuthUser & { id?: string };
}

// Get the authenticated user from the session.
// Returns null if not authenticated.
export async function getUser(): Promise<AuthUser | null> {
  const session = (await auth()) as AuthSession | null;
  if (!session?.user?.email) {
    return null;
  }
  return {
    id: session.user.id || "",
    email: session.user.email,
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
