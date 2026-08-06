CREATE TABLE IF NOT EXISTS "integration_tokens" (
  "id" varchar(36) PRIMARY KEY,
  "user_id" varchar(36) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider" varchar(30) NOT NULL,
  "token_hash" varchar(64) NOT NULL,
  "account_id" varchar(36) REFERENCES "accounts"("id") ON DELETE SET NULL,
  "last_used_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_integration_tokens_user_provider" ON "integration_tokens" ("user_id", "provider");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_integration_tokens_hash" ON "integration_tokens" ("token_hash");
