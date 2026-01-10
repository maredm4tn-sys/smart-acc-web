CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_method" text DEFAULT 'cash' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "token_number" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "requires_token" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "category_id" integer;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "type" text DEFAULT 'purchase' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "related_invoice_id" integer;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;