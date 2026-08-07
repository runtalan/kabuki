-- Refactor holdings table to support Alpaca paper trading
-- Changes: accountId → userId, integrate with paper trading flow

-- Drop old holdings table
DROP TABLE IF EXISTS holdings CASCADE;

-- Create new holdings table tied to user instead of account
CREATE TABLE holdings (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  asset_type VARCHAR(20) NOT NULL,
  quantity NUMERIC(16, 4) NOT NULL,
  cost_basis NUMERIC(16, 2) NOT NULL,
  acquired_at TIMESTAMP NOT NULL,
  option_details JSONB,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_holdings_user_id ON holdings(user_id);
