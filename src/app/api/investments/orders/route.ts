import { NextRequest, NextResponse } from "next/server";
import { requireUser, assertWriteAccess } from "@/lib/auth";
import { submitOrder } from "@/lib/alpaca-trade";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const writeCheck = assertWriteAccess(user);
    if (writeCheck) return writeCheck;

    const body = await req.json();
    const {
      accountId,
      symbol,
      instrumentType = "equity",
      side,
      quantity,
      price,
    } = body;

    if (!accountId || !symbol || !side || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields: accountId, symbol, side, quantity" },
        { status: 400 }
      );
    }

    const cleanSymbol = symbol.trim().toUpperCase();
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: "Quantity must be a positive number" }, { status: 400 });
    }

    if (instrumentType !== "equity") {
      return NextResponse.json({ error: "Only equity trading is supported for Alpaca" }, { status: 400 });
    }

    console.log(`Submitting Alpaca order: ${side.toUpperCase()} ${qty} ${cleanSymbol} for user ${user.id}`);

    const orderResponse = await submitOrder({
      symbol: cleanSymbol,
      qty,
      side: side as "buy" | "sell",
      type: price ? "limit" : "market",
      ...(price && { limitPrice: parseFloat(price) }),
    }, user.id);

    console.log(`Order submitted successfully:`, orderResponse);

    return NextResponse.json({
      success: true,
      message: `Successfully executed ${side.toUpperCase()} order for ${qty} shares of ${cleanSymbol}`,
      order: orderResponse,
    });
  } catch (error: any) {
    console.error("POST /api/investments/orders error:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to execute order" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    return NextResponse.json({
      message: "GET not implemented - use POST to submit orders or check /invest page for positions"
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
