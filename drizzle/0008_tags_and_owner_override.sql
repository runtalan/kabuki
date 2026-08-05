ALTER TABLE "transactions" ADD COLUMN "owner_override" varchar(20);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7) DEFAULT '#6366f1' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "transaction_tags" (
	"transaction_id" varchar(36) NOT NULL,
	"tag_id" varchar(36) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tags_name" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_transaction_tags_unique" ON "transaction_tags" USING btree ("transaction_id","tag_id");--> statement-breakpoint
CREATE INDEX "idx_transaction_tags_transaction_id" ON "transaction_tags" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_transaction_tags_tag_id" ON "transaction_tags" USING btree ("tag_id");
