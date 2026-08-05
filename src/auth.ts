import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { ensureDemoDataFresh } from "@/lib/demo-data";

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;

        // Find user in database
        const user = await db.query.users.findFirst({
          where: eq(users.username, username),
        });

        if (!user) return null;

        // Verify password
        const isPasswordValid = await bcrypt.compare(
          password,
          user.passwordHash
        );
        if (!isPasswordValid) return null;

        // Only ever does real work once per real calendar day (no-ops
        // instantly otherwise) and only for the demo user — real logins
        // never touch this.
        if (user.isDemo) {
          await ensureDemoDataFresh();
        }

        return {
          id: user.id,
          email: user.username,
          name: user.username,
          isDemo: user.isDemo,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.isDemo = (user as { isDemo?: boolean }).isDemo ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session.user as { isDemo?: boolean }).isDemo = token.isDemo as boolean;
      }
      return session;
    },
  },
});
