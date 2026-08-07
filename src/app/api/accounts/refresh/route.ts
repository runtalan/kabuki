import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { plaidItems, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { syncAccounts, syncTransactions } from "@/lib/plaid-sync";
import { getHouseholdUserIds } from "@/lib/household";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await req.json();

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId is required" },
        { status: 400 }
      );
    }

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.isDemo) {
      return NextResponse.json({ error: "Demo account is view-only" }, { status: 403 });
    }

    // Get Plaid item (verify ownership)
    const item = await db.query.plaidItems.findFirst({
      where: eq(plaidItems.id, itemId),
    });

    if (!item || !(await getHouseholdUserIds(user.id)).includes(item.userId)) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Update sync status
    await db
      .update(plaidItems)
      .set({ syncStatus: "syncing" })
      .where(eq(plaidItems.id, itemId));

    try {
      // Sync accounts and transactions
      await syncAccounts(itemId, item.accessToken, user.username);
      await syncTransactions(itemId, item.accessToken, user.id);

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
