-- Create trading_orders table for trade execution history
CREATE TABLE IF NOT EXISTS trading_orders (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id VARCHAR(36) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  instrument_type VARCHAR(20) NOT NULL DEFAULT 'equity',
  side VARCHAR(10) NOT NULL,
  quantity NUMERIC(16, 4) NOT NULL,
  execution_price NUMERIC(16, 4) NOT NULL,
  total_amount NUMERIC(16, 2) NOT NULL,
  option_type VARCHAR(10),
  strike_price NUMERIC(12, 4),
  expiration_date TIMESTAMP,
  contract_symbol VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'executed',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trading_orders_user_id ON trading_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_orders_symbol ON trading_orders(symbol);

-- Create option_holdings table for active option contracts
CREATE TABLE IF NOT EXISTS option_holdings (
  id VARCHAR(36) PRIMARY KEY,
  account_id VARCHAR(36) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  underlying_symbol VARCHAR(20) NOT NULL,
  contract_symbol VARCHAR(50) NOT NULL,
  option_type VARCHAR(10) NOT NULL,
  strike_price NUMERIC(12, 4) NOT NULL,
  expiration_date TIMESTAMP NOT NULL,
  contracts NUMERIC(16, 4) NOT NULL,
  cost_basis NUMERIC(16, 2) NOT NULL,
  average_premium NUMERIC(12, 4) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_option_holdings_account_id ON option_holdings(account_id);
CREATE INDEX IF NOT EXISTS idx_option_holdings_symbol ON option_holdings(underlying_symbol);
CREATE UNIQUE INDEX IF NOT EXISTS idx_option_holdings_contract ON option_holdings(account_id, contract_symbol);
