"use server";

import { db } from "@/db";
import { tradingOrders, holdings } from "@/db/schema";
import { submitOrder, type OrderRequest } from "@/lib/alpaca-trade";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/id";

export interface TradeExecutionRequest {
  symbol: string;
  quantity: number;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  limitPrice?: number;
  userId: string;
  accountId: string;
}

export interface TradeExecutionResponse {
  success: boolean;
  orderId?: string;
  message: string;
  error?: string;
}

export async function executeTradeAction(
  request: TradeExecutionRequest
): Promise<TradeExecutionResponse> {
  try {
    const { symbol, quantity, side, orderType, limitPrice, userId, accountId } =
      request;

    // Validate required fields
    if (!symbol || quantity <= 0 || !side || !orderType || !userId || !accountId) {
      return {
        success: false,
        message: "Invalid trade parameters",
        error: "Missing or invalid required fields",
      };
    }

    // Validate limit price for limit orders
    if (orderType === "limit" && (!limitPrice || limitPrice <= 0)) {
      return {
        success: false,
        message: "Limit price required for limit orders",
        error: "Invalid limit price",
      };
    }

    // Build Alpaca order request
    const orderRequest: OrderRequest = {
      symbol,
      qty: quantity,
      side,
      type: orderType,
      limitPrice,
    };

    // Submit order to Alpaca
    const alpacaOrder = await submitOrder(orderRequest);

    if (!alpacaOrder || alpacaOrder.status === "canceled") {
      return {
        success: false,
        message: "Order submission failed",
        error: `Order was not filled. Status: ${alpacaOrder?.status}`,
      };
    }

    const executionPrice = parseFloat(alpacaOrder.filledAvgPrice);
    const filledQty = alpacaOrder.filledQty || quantity;

    // Record the trade in tradingOrders
    const orderId = generateId();
    await db.insert(tradingOrders).values({
      id: orderId,
      userId,
      accountId,
      symbol,
      instrumentType: "equity",
      side,
      quantity: String(filledQty),
      executionPrice: String(executionPrice),
      totalAmount: String(filledQty * executionPrice),
      status: "executed",
      createdAt: new Date(),
    });

    // Update or insert holding
    if (side === "buy") {
      const existing = await db.query.holdings.findFirst({
        where: and(eq(holdings.userId, userId), eq(holdings.symbol, symbol)),
      });

      if (existing) {
        // Update existing holding: recalculate weighted average cost
        const existingQty = Number(existing.quantity);
        const existingCostBasis = Number(existing.costBasis);
        const newCostBasis = executionPrice * filledQty;
        const totalQty = existingQty + filledQty;
        const weightedAvgCost = (existingCostBasis + newCostBasis) / totalQty;

        await db
          .update(holdings)
          .set({
            quantity: String(totalQty),
            costBasis: String(weightedAvgCost * totalQty),
            updatedAt: new Date(),
          })
          .where(eq(holdings.id, existing.id));
      } else {
        // Create new holding
        await db.insert(holdings).values({
          userId,
          symbol,
          assetType: "stock",
          quantity: String(filledQty),
          costBasis: String(executionPrice * filledQty),
          acquiredAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } else if (side === "sell") {
      // Reduce or remove holding on sell
      const existing = await db.query.holdings.findFirst({
        where: and(eq(holdings.userId, userId), eq(holdings.symbol, symbol)),
      });

      if (existing) {
        const existingQty = Number(existing.quantity);
        const remainingQty = existingQty - filledQty;

        if (remainingQty <= 0) {
          // Remove holding if all shares sold
          await db.delete(holdings).where(eq(holdings.id, existing.id));
        } else {
          // Update quantity, keep same cost basis per share
          const costPerShare = Number(existing.costBasis) / existingQty;
          await db
            .update(holdings)
            .set({
              quantity: String(remainingQty),
              costBasis: String(costPerShare * remainingQty),
              updatedAt: new Date(),
            })
            .where(eq(holdings.id, existing.id));
        }
      }
    }

    return {
      success: true,
      orderId,
      message: `Order executed successfully. ${filledQty} shares of ${symbol} ${side} at $${executionPrice.toFixed(2)}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Trade execution error:", errorMessage);
    return {
      success: false,
      message: "Trade execution failed",
      error: errorMessage,
    };
  }
}
