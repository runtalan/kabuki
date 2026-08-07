import { Alpaca } from "@alpacahq/alpaca-trade-api";

const alpaca = new Alpaca({
  keyId: process.env.APCA_API_KEY_ID!,
  secret: process.env.APCA_API_SECRET_KEY!,
  paper: true,
});

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

export async function getAccountInfo(): Promise<AccountInfo> {
  const account = await alpaca.trading.account.getAccount();

  return {
    equity: parseFloat(String(account.equity || 0)),
    buyingPower: parseFloat(String(account.buying_power || 0)),
    cashAvailable: parseFloat(String(account.cash || 0)),
    accountValue: parseFloat(String(account.portfolio_value || 0)),
  };
}

export async function submitOrder(
  orderRequest: OrderRequest
): Promise<OrderResponse> {
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

export { alpaca };
