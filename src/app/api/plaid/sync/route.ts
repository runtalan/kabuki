import { NextRequest, NextResponse } from "next/server";
import { requireUser, assertWriteAccess } from "@/lib/auth";
import { db } from "@/db";
import { plaidItems } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { syncAccounts, syncTransactions } from "@/lib/plaid-sync";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    // Get all Plaid items for this user
    const userPlaidItems = await db.query.plaidItems.findMany({
      where: inArray(plaidItems.userId, user.householdUserIds),
    });

    if (userPlaidItems.length === 0) {
      return NextResponse.json(
        { error: "No linked bank accounts found" },
        { status: 404 }
      );
    }

    const results = [];

    // Sync accounts and transactions for each Plaid item
    for (const item of userPlaidItems) {
      try {
        await syncAccounts(item.id, item.accessToken);
        await syncTransactions(item.id, item.accessToken);
        results.push({
          itemId: item.id,
          status: "success",
        });
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        results.push({
          itemId: item.id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Sync completed",
      results,
    });
  } catch (error) {
    console.error("Sync error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to sync accounts" },
      { status: 500 }
    );
  }
}
