ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "merchant_entity_id" varchar(255);
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "merchant_logo_url" text;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "pfc_primary" varchar(50);
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "pfc_detailed" varchar(50);
CREATE INDEX IF NOT EXISTS "idx_transactions_merchant_entity_id" ON "transactions" ("merchant_entity_id");
