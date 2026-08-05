CREATE TABLE IF NOT EXISTS "recurring_series" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "user_id" varchar(36) NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "merchant_key" varchar(255) NOT NULL,
  "merchant_name" varchar(255) NOT NULL,
  "status" varchar(20) DEFAULT 'confirmed' NOT NULL,
  "is_manual" boolean DEFAULT false NOT NULL,
  "frequency" varchar(20),
  "amount" numeric(16, 2),
  "category_id" varchar(36) REFERENCES "categories"("id") ON DELETE set null,
  "next_date" timestamp,
  "is_income" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_recurring_series_user_merchant" ON "recurring_series" ("user_id", "merchant_key");
CREATE INDEX IF NOT EXISTS "idx_recurring_series_user_id" ON "recurring_series" ("user_id");
