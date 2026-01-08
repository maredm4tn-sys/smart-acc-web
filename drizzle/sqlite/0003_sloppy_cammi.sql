ALTER TABLE `invoices` ADD `type` text DEFAULT 'sale' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `related_invoice_id` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `notes` text;