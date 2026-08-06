import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getOptionChain } from "@/lib/yahoo-finance";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");
    const date = searchParams.get("date") || undefined;

    if (!symbol) {
      return NextResponse.json(
        { error: "Missing required 'symbol' query parameter (e.g. ?symbol=AAPL)" },
        { status: 400 }
      );
    }

    const optionChain = await getOptionChain(symbol, date);
    return NextResponse.json(optionChain);
  } catch (error: any) {
    console.error("GET /api/investments/options error:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch option chain" },
      { status: 500 }
    );
  }
}
