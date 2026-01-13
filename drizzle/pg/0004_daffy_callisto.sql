CREATE TABLE "advances" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" integer NOT NULL,
	"date" date NOT NULL,
	"salary_month" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"type" text DEFAULT 'advance' NOT NULL,
	"treasury_account_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" integer NOT NULL,
	"date" date NOT NULL,
	"check_in" text,
	"check_out" text,
	"status" text DEFAULT 'present' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"basic_salary" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "installments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" integer NOT NULL,
	"invoice_id" integer,
	"due_date" date NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"amount_paid" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payrolls" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" integer NOT NULL,
	"payment_date" date NOT NULL,
	"salary_month" text NOT NULL,
	"basic_salary" numeric(15, 2) NOT NULL,
	"incentives" numeric(15, 2) DEFAULT '0.00',
	"deductions" numeric(15, 2) DEFAULT '0.00',
	"advance_deductions" numeric(15, 2) DEFAULT '0.00',
	"net_salary" numeric(15, 2) NOT NULL,
	"treasury_account_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "representatives" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"address" text,
	"type" text DEFAULT 'sales' NOT NULL,
	"commission_rate" numeric(5, 2) DEFAULT '0.00',
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"shift_number" integer NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"start_balance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"end_balance" numeric(15, 2) DEFAULT '0.00',
	"system_cash_balance" numeric(15, 2) DEFAULT '0.00',
	"system_visa_balance" numeric(15, 2) DEFAULT '0.00',
	"system_unpaid_balance" numeric(15, 2) DEFAULT '0.00',
	"status" text DEFAULT 'open' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "national_id" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "credit_limit" numeric(15, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "payment_day" integer;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "opening_balance" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "price_level" text DEFAULT 'retail' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "representative_id" integer;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "is_installment" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "installment_down_payment" numeric(15, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "installment_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "installment_interest" numeric(15, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "installment_monthly_amount" numeric(15, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "representative_id" integer;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "shift_id" integer;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "opening_balance" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "shift_id" integer;--> statement-breakpoint
ALTER TABLE "advances" ADD CONSTRAINT "advances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advances" ADD CONSTRAINT "advances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advances" ADD CONSTRAINT "advances_treasury_account_id_accounts_id_fk" FOREIGN KEY ("treasury_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_treasury_account_id_accounts_id_fk" FOREIGN KEY ("treasury_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "representatives" ADD CONSTRAINT "representatives_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_representative_id_representatives_id_fk" FOREIGN KEY ("representative_id") REFERENCES "public"."representatives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_representative_id_representatives_id_fk" FOREIGN KEY ("representative_id") REFERENCES "public"."representatives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;