CREATE TABLE "option_holdings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"account_id" varchar(36) NOT NULL,
	"underlying_symbol" varchar(20) NOT NULL,
	"contract_symbol" varchar(50) NOT NULL,
	"option_type" varchar(10) NOT NULL,
	"strike_price" numeric(12, 4) NOT NULL,
	"expiration_date" timestamp NOT NULL,
	"contracts" numeric(16, 4) NOT NULL,
	"cost_basis" numeric(16, 2) NOT NULL,
	"average_premium" numeric(12, 4) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"account_id" varchar(36) NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"quantity" numeric(12, 4) NOT NULL,
	"execution_price" numeric(12, 4) NOT NULL,
	"order_type" varchar(20) NOT NULL,
	"side" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT 'filled' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trading_orders" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"account_id" varchar(36) NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"instrument_type" varchar(20) DEFAULT 'equity' NOT NULL,
	"side" varchar(10) NOT NULL,
	"quantity" numeric(16, 4) NOT NULL,
	"execution_price" numeric(16, 4) NOT NULL,
	"total_amount" numeric(16, 2) NOT NULL,
	"option_type" varchar(10),
	"strike_price" numeric(12, 4),
	"expiration_date" timestamp,
	"contract_symbol" varchar(50),
	"status" varchar(20) DEFAULT 'executed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "order" integer;--> statement-breakpoint
ALTER TABLE "option_holdings" ADD CONSTRAINT "option_holdings_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_orders" ADD CONSTRAINT "trading_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_orders" ADD CONSTRAINT "trading_orders_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_option_holdings_account_id" ON "option_holdings" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_option_holdings_symbol" ON "option_holdings" USING btree ("underlying_symbol");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_option_holdings_contract" ON "option_holdings" USING btree ("account_id","contract_symbol");--> statement-breakpoint
CREATE INDEX "idx_trades_account_id" ON "trades" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_trading_orders_user_id" ON "trading_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_trading_orders_symbol" ON "trading_orders" USING btree ("symbol");