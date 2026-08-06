import { NextRequest, NextResponse } from "next/server";
import { requireUser, assertWriteAccess } from "@/lib/auth";
import { db } from "@/db";
import { accounts, holdings, optionHoldings, tradingOrders } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getRealtimeQuotes } from "@/lib/yahoo-finance";
import { generateId } from "@/lib/id";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");

    const orders = await db.query.tradingOrders.findMany({
      where: accountId
        ? and(eq(tradingOrders.userId, user.id), eq(tradingOrders.accountId, accountId))
        : eq(tradingOrders.userId, user.id),
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    });

    return NextResponse.json({ orders });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const writeCheck = assertWriteAccess(user);
    if (writeCheck) return writeCheck;

    const body = await req.json();
    const {
      accountId,
      symbol,
      instrumentType = "equity", // "equity" | "option"
      side, // "buy" | "sell"
      quantity,
      price,
      optionDetails, // { optionType: 'call'|'put', strikePrice, expirationDate, contractSymbol }
    } = body;

    if (!accountId || !symbol || !side || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields: accountId, symbol, side ('buy'|'sell'), quantity" },
        { status: 400 }
      );
    }

    const cleanSymbol = symbol.trim().toUpperCase();
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: "Quantity must be a positive number" }, { status: 400 });
    }

    // Verify account exists
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, accountId),
    });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Determine execution price from live Yahoo Finance quote if not provided
    let executionPrice = price ? Number(price) : 0;
    if (!executionPrice || isNaN(executionPrice)) {
      const [quote] = await getRealtimeQuotes([cleanSymbol]);
      executionPrice = quote?.regularMarketPrice ?? 0;
    }

    if (!executionPrice || executionPrice <= 0) {
      return NextResponse.json({ error: `Unable to get market price for ${cleanSymbol}` }, { status: 400 });
    }

    // Option contracts represent 100 shares per contract
    const multiplier = instrumentType === "option" ? 100 : 1;
    const totalAmount = qty * executionPrice * multiplier;
    const currentBalance = Number(account.currentBalance);

    if (side === "buy" && currentBalance < totalAmount) {
      return NextResponse.json(
        {
          error: `Insufficient account balance. Required: $${totalAmount.toFixed(
            2
          )}, Available: $${currentBalance.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    // Execute trade atomically in a database transaction
    await db.transaction(async (tx) => {
      // 1. Record the order
      await tx.insert(tradingOrders).values({
        id: generateId(),
        userId: user.id,
        accountId,
        symbol: cleanSymbol,
        instrumentType,
        side,
        quantity: qty.toString(),
        executionPrice: executionPrice.toString(),
        totalAmount: totalAmount.toFixed(2),
        ...(optionDetails && {
          optionType: optionDetails.optionType,
          strikePrice: optionDetails.strikePrice?.toString(),
          expirationDate: optionDetails.expirationDate ? new Date(optionDetails.expirationDate) : null,
          contractSymbol: optionDetails.contractSymbol,
        }),
      });

      // 2. Adjust account cash balance
      const updatedBalance = side === "buy" ? currentBalance - totalAmount : currentBalance + totalAmount;
      await tx
        .update(accounts)
        .set({ currentBalance: updatedBalance.toFixed(2), updatedAt: new Date() })
        .where(eq(accounts.id, accountId));

      // 3. Update holdings or option_holdings
      if (instrumentType === "equity") {
        const existing = await tx.query.holdings.findFirst({
          where: and(eq(holdings.accountId, accountId), eq(holdings.symbol, cleanSymbol)),
        });

        if (side === "buy") {
          if (existing) {
            const oldShares = Number(existing.shares);
            const oldCost = Number(existing.costBasis);
            const newShares = oldShares + qty;
            const newCostBasis = oldCost + totalAmount;

            await tx
              .update(holdings)
              .set({
                shares: newShares.toString(),
                costBasis: newCostBasis.toFixed(2),
                currentPrice: executionPrice.toString(),
                updatedAt: new Date(),
              })
              .where(eq(holdings.id, existing.id));
          } else {
            await tx.insert(holdings).values({
              id: generateId(),
              accountId,
              symbol: cleanSymbol,
              name: cleanSymbol,
              assetClass: "us_stock",
              shares: qty.toString(),
              costBasis: totalAmount.toFixed(2),
              currentPrice: executionPrice.toString(),
            });
          }
        } else {
          // Sell equity
          if (!existing || Number(existing.shares) < qty) {
            throw new Error(`Cannot sell ${qty} shares. Insufficient holdings.`);
          }

          const oldShares = Number(existing.shares);
          const remainingShares = oldShares - qty;

          if (remainingShares <= 0) {
            await tx.delete(holdings).where(eq(holdings.id, existing.id));
          } else {
            const oldCost = Number(existing.costBasis);
            const proportionalCost = (oldCost / oldShares) * remainingShares;
            await tx
              .update(holdings)
              .set({
                shares: remainingShares.toString(),
                costBasis: proportionalCost.toFixed(2),
                currentPrice: executionPrice.toString(),
                updatedAt: new Date(),
              })
              .where(eq(holdings.id, existing.id));
          }
        }
      } else if (instrumentType === "option" && optionDetails?.contractSymbol) {
        const contractSymbol = optionDetails.contractSymbol;
        const existingOption = await tx.query.optionHoldings.findFirst({
          where: and(eq(optionHoldings.accountId, accountId), eq(optionHoldings.contractSymbol, contractSymbol)),
        });

        if (side === "buy") {
          if (existingOption) {
            const oldContracts = Number(existingOption.contracts);
            const oldCost = Number(existingOption.costBasis);
            const newContracts = oldContracts + qty;
            const newCost = oldCost + totalAmount;

            await tx
              .update(optionHoldings)
              .set({
                contracts: newContracts.toString(),
                costBasis: newCost.toFixed(2),
                averagePremium: (newCost / (newContracts * 100)).toFixed(4),
                updatedAt: new Date(),
              })
              .where(eq(optionHoldings.id, existingOption.id));
          } else {
            await tx.insert(optionHoldings).values({
              id: generateId(),
              accountId,
              underlyingSymbol: cleanSymbol,
              contractSymbol,
              optionType: optionDetails.optionType,
              strikePrice: optionDetails.strikePrice.toString(),
              expirationDate: new Date(optionDetails.expirationDate),
              contracts: qty.toString(),
              costBasis: totalAmount.toFixed(2),
              averagePremium: executionPrice.toString(),
            });
          }
        } else {
          // Sell option
          if (!existingOption || Number(existingOption.contracts) < qty) {
            throw new Error(`Cannot sell ${qty} contracts. Insufficient option position.`);
          }

          const oldContracts = Number(existingOption.contracts);
          const remainingContracts = oldContracts - qty;

          if (remainingContracts <= 0) {
            await tx.delete(optionHoldings).where(eq(optionHoldings.id, existingOption.id));
          } else {
            const oldCost = Number(existingOption.costBasis);
            const remainingCost = (oldCost / oldContracts) * remainingContracts;
            await tx
              .update(optionHoldings)
              .set({
                contracts: remainingContracts.toString(),
                costBasis: remainingCost.toFixed(2),
                updatedAt: new Date(),
              })
              .where(eq(optionHoldings.id, existingOption.id));
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully executed ${side.toUpperCase()} order for ${qty} ${
        instrumentType === "option" ? "contracts" : "shares"
      } of ${cleanSymbol} at $${executionPrice.toFixed(2)}.`,
      totalAmount,
    });
  } catch (error: any) {
    console.error("POST /api/investments/orders error:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Failed to execute order" }, { status: 500 });
  }
}
