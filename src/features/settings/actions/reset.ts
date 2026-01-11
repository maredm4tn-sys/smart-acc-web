"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function factoryReset() {
    try {
        const { eq, inArray } = await import("drizzle-orm");
        const { requireTenant } = await import("@/lib/tenant-security");
        const tenantId = await requireTenant();

        // 1. Fetch IDs for Deletion (To Manually Cascade)
        // We do this to ensure lines are deleted even if DB Foreign Keys / Cascades are not active (common in SQLite).

        // A. Journal Entries
        const journalEntriesList = await db.select({ id: schema.journalEntries.id }).from(schema.journalEntries).where(eq(schema.journalEntries.tenantId, tenantId));
        const journalIds = journalEntriesList.map(j => j.id);

        // B. Invoices
        const invoicesList = await db.select({ id: schema.invoices.id }).from(schema.invoices).where(eq(schema.invoices.tenantId, tenantId));
        const invoiceIds = invoicesList.map(i => i.id);

        // C. Purchase Invoices
        const purchasesList = await db.select({ id: schema.purchaseInvoices.id }).from(schema.purchaseInvoices).where(eq(schema.purchaseInvoices.tenantId, tenantId));
        const purchaseIds = purchasesList.map(p => p.id);

        // 2. Delete Child Tables (Lines/Items)
        if (journalIds.length > 0) {
            await db.delete(schema.journalLines).where(inArray(schema.journalLines.journalEntryId, journalIds));
        }
        if (invoiceIds.length > 0) {
            await db.delete(schema.invoiceItems).where(inArray(schema.invoiceItems.invoiceId, invoiceIds));
        }
        if (purchaseIds.length > 0) {
            await db.delete(schema.purchaseInvoiceItems).where(inArray(schema.purchaseInvoiceItems.purchaseInvoiceId, purchaseIds));
        }

        // 3. Delete Headers
        await db.delete(schema.journalEntries).where(eq(schema.journalEntries.tenantId, tenantId));
        await db.delete(schema.invoices).where(eq(schema.invoices.tenantId, tenantId));
        await db.delete(schema.purchaseInvoices).where(eq(schema.purchaseInvoices.tenantId, tenantId));
        await db.delete(schema.vouchers).where(eq(schema.vouchers.tenantId, tenantId));

        // 4. Delete Master Data
        await db.delete(schema.products).where(eq(schema.products.tenantId, tenantId));
        await db.delete(schema.customers).where(eq(schema.customers.tenantId, tenantId));
        await db.delete(schema.suppliers).where(eq(schema.suppliers.tenantId, tenantId));

        // 5. Delete Accounts (Now safe as JournalLines are gone)
        // We might need to handle parent/child constraints here too? 
        // Assuming accounts don't have strict self-ref FKs or Drizzle handles it.
        await db.delete(schema.accounts).where(eq(schema.accounts.tenantId, tenantId));

        // 6. Logs
        await db.delete(schema.auditLogs).where(eq(schema.auditLogs.tenantId, tenantId));

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
