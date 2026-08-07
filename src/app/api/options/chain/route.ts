import { getOptionChain } from "@/lib/yahoo-finance-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ticker = url.searchParams.get("ticker");
    const expiry = url.searchParams.get("expiry");
    const atmWindowStr = url.searchParams.get("atmWindow") || "5";
    const atmWindow = parseInt(atmWindowStr, 10);

    if (!ticker || !expiry) {
      return Response.json(
        { error: "Missing ticker or expiry query params" },
        { status: 400 }
      );
    }

    if (isNaN(atmWindow) || atmWindow < 1) {
      return Response.json(
        { error: "Invalid atmWindow (must be positive integer)" },
        { status: 400 }
      );
    }

    const chain = await getOptionChain(
      ticker.toUpperCase(),
      expiry,
      atmWindow
    );

    return Response.json(chain);
  } catch (error) {
    console.error("Chain API error:", error);
    return Response.json(
      { error: "Failed to fetch option chain" },
      { status: 500 }
    );
  }
}
