ALTER TABLE "plaid_items" ADD COLUMN "is_manual" boolean DEFAULT false NOT NULL;
ALTER TABLE "accounts" ADD COLUMN "kind" varchar(10) DEFAULT 'asset' NOT NULL;
ALTER TABLE "accounts" ADD COLUMN "liability_type" varchar(30);
ALTER TABLE "accounts" ADD COLUMN "is_manual" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE "account_balance_history" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"account_id" varchar(36) NOT NULL,
	"balance" numeric(16, 2) NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_balance_history" ADD CONSTRAINT "account_balance_history_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_balance_history_account_id" ON "account_balance_history" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_balance_history_recorded_at" ON "account_balance_history" USING btree ("recorded_at");--> statement-breakpoint
UPDATE "accounts" SET "kind" = 'liability' WHERE "type" IN ('credit', 'loan');--> statement-breakpoint
INSERT INTO "account_balance_history" ("id", "account_id", "balance", "recorded_at")
SELECT gen_random_uuid()::text, "id", "current_balance", COALESCE("last_synced_at", "created_at") FROM "accounts";

