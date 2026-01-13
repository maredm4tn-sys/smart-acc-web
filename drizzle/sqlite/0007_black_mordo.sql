CREATE TABLE `categories` (
	`id` integer PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
ALTER TABLE `customers` ADD `price_level` text DEFAULT 'retail' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `discount_amount` text DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `payment_method` text DEFAULT 'cash' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `token_number` integer;--> statement-breakpoint
ALTER TABLE `licensing` ADD `last_used_date` integer;--> statement-breakpoint
ALTER TABLE `products` ADD `price_wholesale` text DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `products` ADD `price_half_wholesale` text DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `products` ADD `price_special` text DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `products` ADD `requires_token` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `category_id` integer REFERENCES categories(id);