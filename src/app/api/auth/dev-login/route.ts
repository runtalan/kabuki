import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { householdByUsername } from "@/lib/households";

// Local-dev-only bypass for the real household accounts, so an assistant
// (or a developer) working on localhost can exercise write paths without a
// real Google OAuth round-trip — the demo account (see /api/auth/demo)
// can't do this since it's hard-blocked to view-only. Hard-gated on
// NODE_ENV so this route 404s in any deployed environment (App Hosting
// always runs with NODE_ENV=production) — see AGENTS.md / ENVIRONMENTS.md
// on never blurring the local/production boundary. Mirrors /api/auth/demo's
// session-cookie-minting approach exactly.
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  const { username } = await request.json();
  if (!householdByUsername(username)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const user = await db.query.users.findFirst({ where: eq(users.username, username) });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const useSecureCookies = (process.env.AUTH_URL ?? "").startsWith("https://");
  const cookieName = `${useSecureCookies ? "__Secure-" : ""}authjs.session-token`;
  const maxAge = 30 * 24 * 60 * 60; // 30 days — matches NextAuth's JWT session default

  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      username: user.username,
      isDemo: user.isDemo,
    },
    secret,
    salt: cookieName,
    maxAge,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: useSecureCookies,
    maxAge,
  });
  return response;
}
