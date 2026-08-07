import { getOptionExpirations } from "@/lib/yahoo-finance-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ticker = url.searchParams.get("ticker");

    if (!ticker) {
      return Response.json(
        { error: "Missing ticker query param" },
        { status: 400 }
      );
    }

    const expirations = await getOptionExpirations(ticker.toUpperCase());

    return Response.json({ expirations });
  } catch (error) {
    console.error("Expirations API error:", error);
    return Response.json(
      { error: "Failed to fetch expirations" },
      { status: 500 }
    );
  }
}
