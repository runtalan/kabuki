import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { plaidItems, accounts } from "@/db/schema";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.username, session.user.email),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get Plaid items with accounts
    const items = await db.query.plaidItems.findMany({
      where: eq(plaidItems.userId, user.id),
      with: {
        accounts: true,
        user: { columns: { username: true } },
      },
    });

    return NextResponse.json({
      items: items.map((item) => ({
        ...item,
        addedByUsername: item.user?.username || null,
      })),
    });
  } catch (error) {
    console.error("Get accounts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}
