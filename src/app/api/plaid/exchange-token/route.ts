import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { plaidClient } from "@/lib/plaid";
import { db } from "@/db";
import { plaidItems } from "@/db/schema";
import { generateId } from "@/lib/id";
import { syncAccounts, syncTransactions } from "@/lib/plaid-sync";
import { z } from "zod";

const ExchangeTokenSchema = z.object({
  public_token: z.string(),
  institution_name: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { public_token, institution_name } = ExchangeTokenSchema.parse(body);

    // Exchange public_token for access_token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Store the Plaid item in the database
    const plaidItemId = generateId();
    await db.insert(plaidItems).values({
      id: plaidItemId,
      userId: user.id,
      itemId,
      accessToken,
      institutionName: institution_name || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Sync accounts and transactions immediately after linking — new
    // accounts default to whoever linked them, not a generic "joint" label.
    await syncAccounts(plaidItemId, accessToken, user.email);
    await syncTransactions(plaidItemId, accessToken, user.id);

    return NextResponse.json({
      success: true,
      plaidItemId,
      message: "Bank account linked and synced successfully",
    });
  } catch (error) {
    console.error("Exchange token error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to exchange token" },
      { status: 500 }
    );
  }
}
