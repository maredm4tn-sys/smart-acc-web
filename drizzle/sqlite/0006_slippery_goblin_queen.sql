CREATE TABLE `licensing` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trial_start_date` integer DEFAULT (unixepoch()),
	`is_activated` integer DEFAULT false NOT NULL,
	`activation_key` text,
	`machine_id` text,
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX `invoice_items_invoice_prod_idx` ON `invoice_items` (`invoice_id`,`product_id`);--> statement-breakpoint
CREATE INDEX `journal_entries_tenant_date_idx` ON `journal_entries` (`tenant_id`,`transaction_date`);--> statement-breakpoint
CREATE INDEX `journal_entries_num_idx` ON `journal_entries` (`tenant_id`,`entry_number`);--> statement-breakpoint
CREATE INDEX `journal_lines_acc_entry_idx` ON `journal_lines` (`account_id`,`journal_entry_id`);