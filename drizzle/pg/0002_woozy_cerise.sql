CREATE TABLE "purchase_invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_invoice_id" integer NOT NULL,
	"product_id" integer,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_cost" numeric(15, 2) NOT NULL,
	"total" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"supplier_id" integer,
	"supplier_name" text NOT NULL,
	"invoice_number" text,
	"reference_number" text,
	"issue_date" date NOT NULL,
	"due_date" date,
	"currency" text DEFAULT 'EGP' NOT NULL,
	"exchange_rate" numeric(10, 6) DEFAULT '1.000000' NOT NULL,
	"subtotal" numeric(15, 2) NOT NULL,
	"tax_total" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_amount" numeric(15, 2) NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"amount_paid" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"voucher_number" text NOT NULL,
	"type" text NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"description" text,
	"reference" text,
	"party_type" text,
	"party_id" integer,
	"account_id" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "type" text DEFAULT 'sale' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "related_invoice_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_purchase_invoice_id_purchase_invoices_id_fk" FOREIGN KEY ("purchase_invoice_id") REFERENCES "public"."purchase_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;