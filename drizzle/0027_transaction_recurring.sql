CREATE TABLE IF NOT EXISTS "transaction_recurring" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "transaction_id" varchar(36) NOT NULL REFERENCES "transactions"("id") ON DELETE cascade,
  "user_id" varchar(36) NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "frequency" varchar(20) NOT NULL,
  "interval_days" integer,
  "next_date" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_transaction_recurring_transaction_id" ON "transaction_recurring" ("transaction_id");
CREATE INDEX IF NOT EXISTS "idx_transaction_recurring_user_id" ON "transaction_recurring" ("user_id");
