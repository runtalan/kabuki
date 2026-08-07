-- Trades table — tracks buy/sell orders (symbol, qty, price, type, side, status)
CREATE TABLE IF NOT EXISTS trades (
  id character varying(36) PRIMARY KEY,
  account_id character varying(36) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  symbol character varying(10) NOT NULL,
  quantity numeric(12,4) NOT NULL,
  execution_price numeric(12,4) NOT NULL,
  order_type character varying(20) NOT NULL,
  side character varying(10) NOT NULL,
  status character varying(20) NOT NULL DEFAULT 'filled',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trades_account_id ON trades(account_id);
