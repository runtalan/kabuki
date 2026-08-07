import { getUser } from "@/lib/auth";
import { getAlpacaClient } from "@/lib/alpaca-trade";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const alpaca = await getAlpacaClient(user.id);

    // Test: Get account info
    const account = await alpaca.trading.account.getAccount();
    const positions = await alpaca.trading.positions.getAllOpenPositions();

    return NextResponse.json({
      success: true,
      userId: user.id,
      account: {
        equity: account.equity,
        cash: account.cash,
        buyingPower: account.buying_power,
        portfolioValue: account.portfolio_value,
      },
      positionsCount: positions.length,
      positions: positions.map((p: any) => ({
        symbol: p.symbol,
        qty: p.qty,
        market_value: p.market_value,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || "Failed to connect to Alpaca",
      details: error.toString(),
    });
  }
}
