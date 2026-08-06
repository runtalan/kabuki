import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { searchSymbols } from "@/lib/yahoo-finance";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q || !q.trim()) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchSymbols(q);
    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("GET /api/investments/search error:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to search ticker symbols" },
      { status: 500 }
    );
  }
}
