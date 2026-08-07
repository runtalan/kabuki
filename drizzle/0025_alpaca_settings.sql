-- Create alpaca_settings table for Alpaca API credentials per user
CREATE TABLE alpaca_settings (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key_id VARCHAR(255) NOT NULL,
  api_secret_key VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_alpaca_settings_user_id ON alpaca_settings(user_id);
