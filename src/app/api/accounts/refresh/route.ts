import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { plaidItems } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { syncAccounts, syncTransactions } from "@/lib/plaid-sync";
import { getUser, assertWriteAccess } from "@/lib/auth";
import { getPlaidClient } from "@/lib/plaid";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const { itemId } = await req.json();

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId is required" },
        { status: 400 }
      );
    }

    // Get Plaid item (verify ownership)
    const item = await db.query.plaidItems.findFirst({
      where: eq(plaidItems.id, itemId),
    });

    if (!item || !user.householdUserIds.includes(item.userId)) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const plaidClient = getPlaidClient(user.household.plaidEnvSuffix);

    // Update sync status
    await db
      .update(plaidItems)
      .set({ syncStatus: "syncing" })
      .where(eq(plaidItems.id, itemId));

    try {
      // Sync accounts and transactions
      await syncAccounts(plaidClient, itemId, item.accessToken, user.username);
      await syncTransactions(plaidClient, itemId, item.accessToken, user.id);

      // Update sync status to idle
      await db
        .update(plaidItems)
        .set({ syncStatus: "idle", lastError: null })
        .where(eq(plaidItems.id, itemId));

      return NextResponse.json({ success: true, message: "Synced successfully" });
    } catch (syncError) {
      const errorMsg = syncError instanceof Error ? syncError.message : "Unknown error";
      await db
        .update(plaidItems)
        .set({ syncStatus: "error", lastError: errorMsg })
        .where(eq(plaidItems.id, itemId));

      return NextResponse.json(
        { error: "Sync failed: " + errorMsg },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      { error: "Failed to refresh accounts" },
      { status: 500 }
    );
  }
}
