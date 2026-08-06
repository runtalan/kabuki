import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { handleDemoLogin } from "@/auth";

// Establishes a session for the shared, view-only demo account. Google OIDC
// can't authenticate this account (it has no real Google identity), so
// instead of going through the `signIn()` provider flow we mint a session
// cookie directly: look up (and refresh) the demo user via
// `handleDemoLogin()`, then hand-encrypt a NextAuth-compatible JWT and set
// it as the session cookie ourselves. This mirrors exactly what the `jwt`
// callback in `src/auth.ts` would produce for a real sign-in, and uses the
// same `encode()`/salt/cookie-name conventions Auth.js uses internally
// (see @auth/core/lib/utils/session.js) so `auth()` can read it back
// normally on the next request.
export async function POST() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  let demoUser;
  try {
    demoUser = await handleDemoLogin();
  } catch (err) {
    console.error("Demo login failed", err);
    return NextResponse.json({ error: "Demo login failed." }, { status: 500 });
  }

  const useSecureCookies = (process.env.AUTH_URL ?? "").startsWith("https://");
  const cookieName = `${useSecureCookies ? "__Secure-" : ""}authjs.session-token`;
  const maxAge = 30 * 24 * 60 * 60; // 30 days — matches NextAuth's JWT session default

  const token = await encode({
    token: {
      sub: demoUser.id,
      id: demoUser.id,
      email: demoUser.email,
      username: demoUser.username,
      isDemo: demoUser.isDemo,
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
