CREATE TABLE `purchase_invoice_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_invoice_id` integer NOT NULL,
	`product_id` integer,
	`description` text NOT NULL,
	`quantity` text NOT NULL,
	`unit_cost` text NOT NULL,
	`total` text NOT NULL,
	FOREIGN KEY (`purchase_invoice_id`) REFERENCES `purchase_invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`supplier_id` integer,
	`supplier_name` text NOT NULL,
	`invoice_number` text,
	`reference_number` text,
	`issue_date` text NOT NULL,
	`due_date` text,
	`currency` text DEFAULT 'EGP' NOT NULL,
	`exchange_rate` text DEFAULT '1.000000' NOT NULL,
	`subtotal` text NOT NULL,
	`tax_total` text DEFAULT '0.00' NOT NULL,
	`total_amount` text NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`amount_paid` text DEFAULT '0.00' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`notes` text,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vouchers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`voucher_number` text NOT NULL,
	`type` text NOT NULL,
	`date` text NOT NULL,
	`amount` text NOT NULL,
	`description` text,
	`reference` text,
	`party_type` text,
	`party_id` integer,
	`account_id` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
