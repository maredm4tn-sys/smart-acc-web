ALTER TABLE `purchase_invoices` ADD `type` text DEFAULT 'purchase' NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_invoices` ADD `related_invoice_id` integer;