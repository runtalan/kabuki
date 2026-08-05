import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { plaidItems, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
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
      where: eq(users.username, session.user.email),
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

    if (!item || item.userId !== user.id) {
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
