import { Alpaca } from "@alpacahq/alpaca-trade-api";
import { db } from "@/db";
import { alpacaSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getAlpacaClient(userId?: string) {
  let keyId = process.env.APCA_API_KEY_ID;
  let secret = process.env.APCA_API_SECRET_KEY;

  if (userId) {
    try {
      const settings = await db.query.alpacaSettings.findFirst({
        where: eq(alpacaSettings.userId, userId),
      });
      if (settings) {
        keyId = settings.apiKeyId;
        secret = settings.apiSecretKey;
      }
    } catch (error) {
      console.warn("Failed to fetch Alpaca settings from DB, using env vars:", error);
    }
  }

  if (!keyId || !secret) {
    throw new Error("Alpaca API credentials not found");
  }

  return new Alpaca({
    keyId,
    secret,
    paper: true,
  });
}

export interface AccountInfo {
  equity: number;
  buyingPower: number;
  cashAvailable: number;
  accountValue: number;
}

export interface OrderRequest {
  symbol: string;
  qty: number;
  side: "buy" | "sell";
  type: "market" | "limit";
  limitPrice?: number;
}

export interface OrderResponse {
  id: string;
  symbol: string;
  qty: number;
  side: string;
  type: string;
  status: string;
  filledQty: number;
  filledAvgPrice: string;
  createdAt: string;
}

export interface Position {
  symbol: string;
  qty: number;
  marketValue: number;
  costBasis: number;
  unrealizedPl: number;
  unrealizedPlpc: number;
  currentPrice: number;
  assetClass: string;
}

export interface PortfolioSummary {
  totalPortfolioValue: number;
  totalCash: number;
  buyingPower: number;
  dailyPl: number;
  dailyPlpc: number;
}

export async function getAccountInfo(userId?: string): Promise<AccountInfo> {
  const alpaca = await getAlpacaClient(userId);
  const account = await alpaca.trading.account.getAccount();

  return {
    equity: parseFloat(String(account.equity || 0)),
    buyingPower: parseFloat(String(account.buying_power || 0)),
    cashAvailable: parseFloat(String(account.cash || 0)),
    accountValue: parseFloat(String(account.portfolio_value || 0)),
  };
}

export async function submitOrder(
  orderRequest: OrderRequest,
  userId?: string
): Promise<OrderResponse> {
  const alpaca = await getAlpacaClient(userId);
  const order = await (orderRequest.type === "market"
    ? alpaca.trading.orders.market({
        symbol: orderRequest.symbol,
        qty: orderRequest.qty,
        side: orderRequest.side as "buy" | "sell",
        timeInForce: "day",
      })
    : alpaca.trading.orders.limit({
        symbol: orderRequest.symbol,
        qty: orderRequest.qty,
        side: orderRequest.side as "buy" | "sell",
        limitPrice: orderRequest.limitPrice!,
        timeInForce: "day",
      }));

  return {
    id: String(order.id),
    symbol: String(order.symbol),
    qty: typeof order.qty === "number" ? order.qty : parseFloat(String(order.qty)),
    side: String(order.side),
    type: String(order.order_type),
    status: String(order.status),
    filledQty: typeof order.filled_qty === "number" ? order.filled_qty : parseInt(String(order.filled_qty || 0)),
    filledAvgPrice: order.filled_avg_price?.toString() || "0",
    createdAt: String(order.created_at),
  };
}

export async function getPositions(userId?: string): Promise<Position[]> {
  const alpaca = await getAlpacaClient(userId);
  const positions = await alpaca.trading.positions.getAllOpenPositions();

  return positions.map((position: any) => ({
    symbol: String(position.symbol),
    qty: parseFloat(String(position.qty || 0)),
    marketValue: parseFloat(String(position.market_value || 0)),
    costBasis: parseFloat(String(position.cost_basis || 0)),
    unrealizedPl: parseFloat(String(position.unrealized_pl || 0)),
    unrealizedPlpc: parseFloat(String(position.unrealized_plpc || 0)),
    currentPrice: parseFloat(String(position.current_price || 0)),
    assetClass: String(position.asset_class || "equity"),
  }));
}

export async function getPortfolioSummary(userId?: string): Promise<PortfolioSummary> {
  const alpaca = await getAlpacaClient(userId);
  const account = await alpaca.trading.account.getAccount();

  return {
    totalPortfolioValue: parseFloat(String(account.portfolio_value || 0)),
    totalCash: parseFloat(String(account.cash || 0)),
    buyingPower: parseFloat(String(account.buying_power || 0)),
    dailyPl: parseFloat(String(account.daily_pl || 0)),
    dailyPlpc: parseFloat(String(account.daily_plpc || 0)),
  };
}

export { getAlpacaClient };
