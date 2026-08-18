import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { plaidItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUser, assertWriteAccess } from "@/lib/auth";

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

    // Delete Plaid item (cascades to delete accounts and transactions)
    await db.delete(plaidItems).where(eq(plaidItems.id, itemId));

    return NextResponse.json({ success: true, message: "Account disconnected" });
  } catch (error) {
    console.error("Disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 }
    );
  }
}
