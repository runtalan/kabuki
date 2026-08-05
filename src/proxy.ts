import { auth } from "@/auth";
import { NextRequest } from "next/server";

// Protect authenticated routes; redirect to login if not authenticated
export async function proxy(request: NextRequest) {
  const session = await auth();

  // Allow the marketing landing page, login page, and static assets
  if (
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/public")
  ) {
    return;
  }

  // Redirect unauthenticated users to login
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }
}
