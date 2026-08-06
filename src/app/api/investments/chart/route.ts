import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getHistoricalChart } from "@/lib/yahoo-finance";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");
    const range = searchParams.get("range") || "1m"; // '1d' | '5d' | '1m' | '6m' | '1y' | '5y'
    const interval = searchParams.get("interval") || "1d";

    if (!symbol) {
      return NextResponse.json(
        { error: "Missing required 'symbol' query parameter (e.g. ?symbol=AAPL)" },
        { status: 400 }
      );
    }

    const chart = await getHistoricalChart(symbol, range, interval);
    return NextResponse.json(chart);
  } catch (error: any) {
    console.error("GET /api/investments/chart error:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch historical chart data" },
      { status: 500 }
    );
  }
}
