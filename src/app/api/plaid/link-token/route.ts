import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { plaidClient, plaidConfig } from "@/lib/plaid";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    console.log("Session:", JSON.stringify(session, null, 2));

    if (!session?.user) {
      console.log("No session user");
      return NextResponse.json(
        { error: "No session" },
        { status: 401 }
      );
    }

    const username = session.user.email || session.user.name;
    console.log("Username from session:", username);

    if (!username) {
      return NextResponse.json(
        { error: "No username in session" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });
    console.log("User found:", user?.id);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    if (user.isDemo) {
      return NextResponse.json({ error: "Demo account is view-only" }, { status: 403 });
    }

    console.log("Plaid config:", {
      clientId: plaidConfig.clientId ? "set" : "missing",
      secret: plaidConfig.secret ? "set" : "missing",
      env: plaidConfig.env,
      products: plaidConfig.products,
    });

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "Buttons",
      products: plaidConfig.products,
      country_codes: plaidConfig.countryCodes,
      language: "en",
    });

    console.log("Plaid response:", response.data);

    return NextResponse.json({
      link_token: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error: any) {
    console.error("Link token error:", error.response?.data || error.message);
    return NextResponse.json(
      {
        error: "Failed to generate link token",
        details: error.response?.data?.error_message || error.message
      },
      { status: 500 }
    );
  }
}
