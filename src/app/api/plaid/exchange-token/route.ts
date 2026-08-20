import { NextRequest, NextResponse } from "next/server";
import { requireUser, assertWriteAccess } from "@/lib/auth";
import { getPlaidClient, getPlaidConfig } from "@/lib/plaid";
import { db } from "@/db";
import { plaidItems } from "@/db/schema";
import { generateId } from "@/lib/id";
import { syncAccounts, syncTransactions, mergeDuplicateAccounts } from "@/lib/plaid-sync";
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

    // Store the Plaid item — but never blindly insert. `plaid_items.item_id`
    // is unique, and re-linking (or a double-submitted exchange) can hand back
    // an item_id we already hold; inserting would just throw a 500 after the
    // token was already spent. Reuse the existing row instead so linking the
    // same institution twice is idempotent rather than duplicative.
    const existingItem = await db.query.plaidItems.findFirst({
      where: eq(plaidItems.itemId, itemId),
    });

    let plaidItemId: string;
    if (existingItem && user.householdUserIds.includes(existingItem.userId)) {
      plaidItemId = existingItem.id;
      await db
        .update(plaidItems)
        .set({
          accessToken,
          institutionName: institution_name || existingItem.institutionName,
          institutionId: institution_id || existingItem.institutionId,
          syncStatus: "idle",
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(plaidItems.id, existingItem.id));
    } else if (existingItem) {
      // Same Plaid item already linked by someone outside this household.
      return NextResponse.json(
        { error: "This institution is already linked to another account" },
        { status: 409 }
      );
    } else {
      plaidItemId = generateId();
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
    }

    // Sync accounts and transactions immediately after linking — accounts that
    // are genuinely new default to whoever linked them, not a generic "joint"
    // label. Accounts the household already had at this institution are
    // adopted by syncAccounts (see plaid-sync.ts) and keep their own owner.
    await syncAccounts(plaidClient, plaidItemId, accessToken, user.username);
    await syncTransactions(plaidClient, plaidItemId, accessToken, user.id);

    // Belt-and-braces against the case syncAccounts' adoption can't see: two
    // link attempts for the same institution racing (the user re-linked
    // because the first request appeared to hang), where neither sync had the
    // other's accounts in its adoption pool yet. Reconcile after the fact.
    try {
      const merge = await mergeDuplicateAccounts(plaidClient, user.householdUserIds);
      if (merge.merged.length > 0) {
        console.info(
          `Merged ${merge.merged.length} duplicate account(s) after linking:`,
          merge.merged.map((m) => m.keptName)
        );
      }
    } catch (mergeError) {
      console.error("Failed to reconcile duplicate accounts:", mergeError);
    }

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
