import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { holdings, optionHoldings } from "@/db/schema";
import { getRealtimeQuotes } from "@/lib/yahoo-finance";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");

    // 1. Query holdings from DB
    const equityRows = await db.query.holdings.findMany({
      where: accountId ? eq(holdings.accountId, accountId) : undefined,
    });

    const optionRows = await db.query.optionHoldings.findMany({
      where: accountId ? eq(optionHoldings.accountId, accountId) : undefined,
    });

    // 2. Extract unique symbols to batch fetch live quotes from Yahoo Finance
    const stockSymbols = equityRows.map((h) => h.symbol);
    const underlyingOptionSymbols = optionRows.map((o) => o.underlyingSymbol);
    const allSymbols = Array.from(new Set([...stockSymbols, ...underlyingOptionSymbols]));

    const quotes = allSymbols.length ? await getRealtimeQuotes(allSymbols) : [];
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

    // 3. Enrich equity holdings with live market data
    const enrichedHoldings = equityRows.map((row) => {
      const shares = Number(row.shares);
      const costBasis = Number(row.costBasis);
      const quote = quoteMap.get(row.symbol.toUpperCase());
      const currentPrice = quote?.regularMarketPrice ?? Number(row.currentPrice);

      const currentValue = shares * currentPrice;
      const gainLoss = currentValue - costBasis;
      const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

      return {
        id: row.id,
        accountId: row.accountId,
        symbol: row.symbol,
        name: quote?.shortName || row.name,
        assetClass: row.assetClass,
        shares,
        costBasis,
        currentPrice,
        currentValue,
        gainLoss,
        gainLossPct,
        dayChange: (quote?.regularMarketChange ?? 0) * shares,
        dayChangePct: quote?.regularMarketChangePercent ?? 0,
      };
    });

    // 4. Enrich option positions
    const enrichedOptions = optionRows.map((row) => {
      const contracts = Number(row.contracts);
      const costBasis = Number(row.costBasis);
      const strikePrice = Number(row.strikePrice);
      const quote = quoteMap.get(row.underlyingSymbol.toUpperCase());
      const underlyingPrice = quote?.regularMarketPrice ?? 0;

      // Note: option contracts represent 100 shares per contract
      const currentValue = contracts * Number(row.averagePremium) * 100; // default to purchase premium if live option quote unavailable
      const gainLoss = currentValue - costBasis;
      const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

      return {
        id: row.id,
        accountId: row.accountId,
        underlyingSymbol: row.underlyingSymbol,
        contractSymbol: row.contractSymbol,
        optionType: row.optionType,
        strikePrice,
        expirationDate: row.expirationDate,
        contracts,
        costBasis,
        averagePremium: Number(row.averagePremium),
        underlyingPrice,
        currentValue,
        gainLoss,
        gainLossPct,
      };
    });

    const totalEquityValue = enrichedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalOptionsValue = enrichedOptions.reduce((sum, o) => sum + o.currentValue, 0);
    const totalPortfolioValue = totalEquityValue + totalOptionsValue;

    return NextResponse.json({
      holdings: enrichedHoldings,
      options: enrichedOptions,
      summary: {
        totalPortfolioValue,
        totalEquityValue,
        totalOptionsValue,
      },
    });
  } catch (error: any) {
    console.error("GET /api/investments/holdings error:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch portfolio holdings" },
      { status: 500 }
    );
  }
}
