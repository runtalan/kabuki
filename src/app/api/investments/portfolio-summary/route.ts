import { getUser } from "@/lib/auth";
import { getPortfolioSummary } from "@/lib/alpaca-trade";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await getPortfolioSummary(user.id);
    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error("Failed to fetch portfolio summary:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch portfolio summary" },
      { status: 500 }
    );
  }
}
