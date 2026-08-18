import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPlaidClient, getPlaidConfig } from "@/lib/plaid";
import { getUser, assertWriteAccess } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const plaidConfig = getPlaidConfig(user.household.plaidEnvSuffix);
    const plaidClient = getPlaidClient(user.household.plaidEnvSuffix);

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "Buttons",
      products: plaidConfig.products,
      country_codes: plaidConfig.countryCodes,
      language: "en",
    });

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
