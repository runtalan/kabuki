import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureDemoDataFresh } from "@/lib/demo-data";

// Token refresh fix: JWT callback now updates email from database on token refresh

// Only these two Google accounts may sign in — this is a shared-household
// app, not a public signup (see AGENTS.md / ENVIRONMENTS.md). The shared
// demo account is a separate, non-Google flow (see handleDemoLogin below).
const ALLOWED_EMAILS = ["renatountalan@gmail.com", "claudiapuente00@outlook.com"];

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email || !ALLOWED_EMAILS.includes(user.email)) {
        return false; // Reject sign-in for anyone not on the allowlist
      }
      return true;
    },
    async jwt({ token, user }) {
      // `user` is only present on the initial sign-in request. We resolve
      // the canonical DB row by email here rather than trusting whatever
      // Google sends as `name`, so token.id/username/isDemo reflect the
      // household DB record, not the Google profile. (getUser() in
      // lib/auth.ts re-resolves by email on every request for callers that
      // need guaranteed freshness, e.g. after a reseed.)
      console.debug("[jwt] callback", { hasUser: !!user, tokenId: token.id, tokenEmail: token.email });
      if (user?.email) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, user.email),
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.email = dbUser.email;
          token.username = dbUser.username;
          token.isDemo = dbUser.isDemo;
          console.debug("[jwt] populated from user lookup", { email: dbUser.email });
        }
      } else if (token.id) {
        // On token refresh (no user object), refresh the email by looking up
        // the user by id. This corrects stale tokens that may have incorrect
        // email values from a previous authentication flow.
        console.debug("[jwt] refreshing from token.id", { tokenId: token.id });
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, token.id as string),
        });

        if (dbUser) {
          console.debug("[jwt] updated email from ID lookup", { from: token.email, to: dbUser.email });
          token.email = dbUser.email;
          token.username = dbUser.username;
          token.isDemo = dbUser.isDemo;
        } else {
          console.debug("[jwt] user not found by ID", { tokenId: token.id });
        }
      }
      return token;
    },
    async session({ session, token }) {
      console.debug("[session] callback", { session: session.user ? { email: session.user.email } : null, token: { email: token.email, id: token.id } });
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        (session.user as { username?: string }).username = token.username as string;
        (session.user as { isDemo?: boolean }).isDemo = token.isDemo as boolean;
      }
      console.debug("[session] result", { email: session.user?.email });
      return session;
    },
  },
});

// Returns the shared, view-only demo account row and makes sure its rolling
// window of fake data is topped up for today. This does NOT create a
// session itself — Google OIDC can't authenticate the demo account (it has
// no real Google identity), so the demo login route built in a later task
// uses this to look up the account and then establishes a session for it
// directly (e.g. by signing a session cookie), bypassing the Google
// provider entirely.
export async function handleDemoLogin() {
  const demoUser = await db.query.users.findFirst({
    where: eq(users.isDemo, true),
  });

  if (!demoUser) {
    throw new Error("Demo user not found");
  }

  // Only ever does real work once per real calendar day (no-ops instantly
  // otherwise) — real logins never touch this.
  await ensureDemoDataFresh();

  return demoUser;
}
