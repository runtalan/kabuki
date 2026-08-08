ALTER TABLE "transaction_recurring" ADD COLUMN IF NOT EXISTS "dismissed" boolean DEFAULT false NOT NULL;
