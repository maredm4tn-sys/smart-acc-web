"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function factoryReset() {
    try {
        // Order matters due to foreign key constraints.
        // 1. Transactional Lines
        await db.delete(schema.journalLines);
        await db.delete(schema.invoiceItems);
        await db.delete(schema.purchaseInvoiceItems);

        // 2. Transaction Headers
        await db.delete(schema.journalEntries);
        await db.delete(schema.invoices);
        await db.delete(schema.purchaseInvoices);
        await db.delete(schema.vouchers);

        // 3. Master Data (Variable)
        await db.delete(schema.products);
        await db.delete(schema.customers);
        await db.delete(schema.suppliers);
        await db.delete(schema.accounts); // Add Accounts Wipe

        // 4. Reset Tokens & Logs
        try { await db.delete(schema.dailyTokens); } catch (e) { } // If exists
        await db.delete(schema.auditLogs);

        try {
            revalidatePath("/");
        } catch (e) {
            // Ignore revalidate error in script context
        }
        return { success: true };
    } catch (error) {
        console.error("Factory Reset Error:", error);
        return { success: false, error: "Failed to reset data" };
    }
}
