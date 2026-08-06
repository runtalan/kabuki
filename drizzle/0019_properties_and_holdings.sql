-- Manually-tracked real estate (Properties feature). Not linked into
-- `accounts` — kept structurally out of net worth aggregation.
CREATE TABLE IF NOT EXISTS properties (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  owner VARCHAR(20) NOT NULL DEFAULT 'joint',
  estimated_value NUMERIC(16,2) NOT NULL,
  original_loan_amount NUMERIC(16,2) NOT NULL,
  interest_rate NUMERIC(6,3) NOT NULL,
  loan_term_years INTEGER NOT NULL,
  loan_start_date TIMESTAMP NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties (owner);

CREATE TABLE IF NOT EXISTS property_value_history (
  id VARCHAR(36) PRIMARY KEY,
  property_id VARCHAR(36) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  value NUMERIC(16,2) NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_value_history_property_id ON property_value_history (property_id);
CREATE INDEX IF NOT EXISTS idx_property_value_history_recorded_at ON property_value_history (recorded_at);

-- Investment holdings inside a brokerage/retirement account.
CREATE TABLE IF NOT EXISTS holdings (
  id VARCHAR(36) PRIMARY KEY,
  account_id VARCHAR(36) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  symbol VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  asset_class VARCHAR(30) NOT NULL,
  shares NUMERIC(16,4) NOT NULL,
  cost_basis NUMERIC(16,2) NOT NULL,
  current_price NUMERIC(12,4) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_holdings_account_id ON holdings (account_id);
