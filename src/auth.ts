import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureDemoDataFresh } from "@/lib/demo-data";

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
      if (user?.email) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, user.email),
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.email = dbUser.email;
          token.username = dbUser.username;
          token.isDemo = dbUser.isDemo;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        (session.user as { username?: string }).username = token.username as string;
        (session.user as { isDemo?: boolean }).isDemo = token.isDemo as boolean;
      }
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
