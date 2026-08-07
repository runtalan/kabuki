import { getUser } from "@/lib/auth";
import { getAlpacaClient } from "@/lib/alpaca-trade";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getUser();
    const userId = user?.id || "5afeab5f-f7c7-4320-9608-46d3403b347e";

    const alpaca = await getAlpacaClient(userId);
    const positions = await alpaca.trading.positions.getAllOpenPositions();

    return NextResponse.json({
      success: true,
      positionsCount: positions.length,
      rawPositions: positions.map((p: any) => ({
        ...p,
        keys: Object.keys(p),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || "Failed to connect to Alpaca",
      details: error.toString(),
    });
  }
}
