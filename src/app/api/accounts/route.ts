import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { plaidItems } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { getUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Plaid items with accounts
    const items = await db.query.plaidItems.findMany({
      where: inArray(plaidItems.userId, user.householdUserIds),
      columns: { accessToken: false },
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
