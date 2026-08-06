-- Debug/audit log of requests to public integration ingest endpoints
-- (Apple Card Sync today). Dev tooling: shown in Settings so the user can
-- see exactly what a Shortcut sent, headers included, while dialing in the
-- payload shape.
CREATE TABLE IF NOT EXISTS api_request_logs (
  id VARCHAR(36) PRIMARY KEY,
  provider VARCHAR(30) NOT NULL,
  method VARCHAR(10) NOT NULL,
  owner VARCHAR(20),
  status_code INTEGER NOT NULL,
  headers TEXT NOT NULL,
  query_params TEXT,
  body TEXT,
  parsed TEXT,
  error TEXT,
  transaction_id VARCHAR(36) REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_request_logs_provider_created
  ON api_request_logs (provider, created_at);
