CREATE TABLE "rules" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"category_id" varchar(36) NOT NULL,
	"merchant_name" varchar(255) NOT NULL,
	"match_type" varchar(20) DEFAULT 'contains' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_rules_user_id" ON "rules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_rules_category_id" ON "rules" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_rules_merchant_name" ON "rules" USING btree ("merchant_name");
