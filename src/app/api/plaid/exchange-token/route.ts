import { NextRequest, NextResponse } from "next/server";
import { requireUser, assertWriteAccess } from "@/lib/auth";
import { getPlaidClient, getPlaidConfig } from "@/lib/plaid";
import { db } from "@/db";
import { plaidItems } from "@/db/schema";
import { generateId } from "@/lib/id";
import { syncAccounts, syncTransactions } from "@/lib/plaid-sync";
import { cacheInstitutionLogo } from "@/lib/institution-logo";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { householdByUsername } from "@/lib/households";

const ExchangeTokenSchema = z.object({
  public_token: z.string(),
  institution_name: z.string().nullable().optional(),
  institution_id: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;
    const body = await req.json();
    const { public_token, institution_name, institution_id } = ExchangeTokenSchema.parse(body);

    const household = householdByUsername(user.username);
    const suffix = household?.plaidEnvSuffix ?? "";
    const plaidClient = getPlaidClient(suffix);
    const plaidConfig = getPlaidConfig(suffix);

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
      institutionId: institution_id || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Sync accounts and transactions immediately after linking — new
    // accounts default to whoever linked them, not a generic "joint" label.
    await syncAccounts(plaidClient, plaidItemId, accessToken, user.username);
    await syncTransactions(plaidClient, plaidItemId, accessToken, user.id);

    // Best-effort: cache the institution's logo. Never block linking on this.
    if (institution_id) {
      try {
        const logoUrl = await cacheInstitutionLogo(plaidClient, plaidConfig.countryCodes, institution_id);
        if (logoUrl) {
          await db
            .update(plaidItems)
            .set({ institutionLogoUrl: logoUrl })
            .where(eq(plaidItems.id, plaidItemId));
        }
      } catch (logoError) {
        console.error("Failed to cache institution logo:", logoError);
      }
    }

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
