ALTER TABLE "plaid_items" ADD COLUMN IF NOT EXISTS "institution_id" varchar(255);
ALTER TABLE "plaid_items" ADD COLUMN IF NOT EXISTS "institution_logo_url" text;
