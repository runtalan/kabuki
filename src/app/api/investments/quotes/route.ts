import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getRealtimeQuotes } from "@/lib/yahoo-finance";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const rawSymbols = searchParams.get("symbols");

    if (!rawSymbols) {
      return NextResponse.json(
        { error: "Missing required 'symbols' query parameter (e.g. ?symbols=AAPL,NVDA,TSLA)" },
        { status: 400 }
      );
    }

    const symbols = rawSymbols.split(",").map((s) => s.trim()).filter(Boolean);
    if (!symbols.length) {
      return NextResponse.json({ quotes: [] });
    }

    const quotes = await getRealtimeQuotes(symbols);
    return NextResponse.json({ quotes });
  } catch (error: any) {
    console.error("GET /api/investments/quotes error:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch realtime quotes" },
      { status: 500 }
    );
  }
}
