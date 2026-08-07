import { getUser } from "@/lib/auth";
import { getPositions } from "@/lib/alpaca-trade";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const positions = await getPositions(user.id);
    return NextResponse.json({ positions });
  } catch (error: any) {
    console.error("Failed to fetch Alpaca positions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Alpaca positions" },
      { status: 500 }
    );
  }
}
