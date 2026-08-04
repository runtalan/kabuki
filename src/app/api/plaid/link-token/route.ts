import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { plaidClient, plaidConfig } from "@/lib/plaid";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "Kabuki",
      products: plaidConfig.products,
      country_codes: plaidConfig.countryCodes,
      language: "en",
    });

    return NextResponse.json({
      link_token: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error) {
    console.error("Link token error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to generate link token" },
      { status: 500 }
    );
  }
}
