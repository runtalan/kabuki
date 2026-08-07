import { getUser } from "@/lib/auth";
import { db } from "@/db";
import { watchlist } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStockQuote } from "@/lib/yahoo-finance-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch watchlist tickers from DB
    const tickers = await db
      .select({ ticker: watchlist.ticker })
      .from(watchlist)
      .where(eq(watchlist.userId, user.id));

    if (!tickers.length) {
      return Response.json({ watchlist: [] });
    }

    // Enrich with live market data
    const enriched = await Promise.all(
      tickers.map(async (row) => {
        try {
          const quote = await getStockQuote(row.ticker);
          return quote;
        } catch (error) {
          console.error(
            `Failed to fetch quote for ${row.ticker}:`,
            error
          );
          // Return stub on error (later, client will use cache)
          return {
            ticker: row.ticker,
            name: row.ticker,
            currentPrice: 0,
            dayChange: 0,
            dayChangePercent: 0,
            volume: 0,
          };
        }
      })
    );

    return Response.json({ watchlist: enriched });
  } catch (error) {
    console.error("Watchlist API error:", error);
    return Response.json(
      { error: "Failed to fetch watchlist" },
      { status: 500 }
    );
  }
}
