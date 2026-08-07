-- Create trades table to track buy/sell executions
CREATE TABLE IF NOT EXISTS trades (
  id varchar(36) PRIMARY KEY,
  account_id varchar(36) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  symbol varchar(10) NOT NULL,
  quantity numeric(12, 4) NOT NULL,
  execution_price numeric(12, 4) NOT NULL,
  order_type varchar(20) NOT NULL,
  side varchar(10) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'filled',
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_account_id ON trades(account_id);
