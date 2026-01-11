"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function factoryReset() {
    try {
        const { eq } = await import("drizzle-orm");
        const { requireTenant } = await import("@/lib/tenant-security");
        const tenantId = await requireTenant();

        // Order matters due to foreign key constraints.
        // 1. Transactional Lines - Filtered by Header (implicitly) or Join?
        // Actually, straightforward way is to rely on Cascade Delete from Headers if set up,
        // BUT `journalLines` doesn't have tenantId directly, it relies on `journalEntry`.
        // However, `invoiceItems` relies on `invoice`.
        // If we delete headers (Invoices, Journals), the lines should cascade if DB supports it.
        // But if DB is SQLite without foreign_keys=PRAGMA ON, we must delete manually.

        // Safe Approach: Delete referencing tables first using subqueries OR just delete headers if cascade is trusted.
        // Drizzle + SQLite usually needs manual deletion if foreign key constraints aren't strictly enforced by the driver connection.

        // To be safe and tenant-scoped:
        // Delete Lines where Header.tenantId = currentTenant
        // For simplicity in this specific "Reset" action, we can fetch IDs or just delete headers and hope for cascade?
        // NO, we should be explicit.

        // 1. Transaction Headers (Cascade should handle items/lines if configured, but let's be explicit where possible or rely on headers)
        // Since `journalLines` etc don't have `tenantId`, we can't easily `delete from journalLines where tenantId=...`.
        // We MUST delete headers.

        // However, `schema.ts` says: `journalEntryId: integer('...').references(() => journalEntries.id, { onDelete: 'cascade' })`
        // So deleting JournalEntries IS enough.

        await db.delete(schema.journalEntries).where(eq(schema.journalEntries.tenantId, tenantId));
        await db.delete(schema.invoices).where(eq(schema.invoices.tenantId, tenantId));
        await db.delete(schema.purchaseInvoices).where(eq(schema.purchaseInvoices.tenantId, tenantId));
        await db.delete(schema.vouchers).where(eq(schema.vouchers.tenantId, tenantId));

        // 3. Master Data (Variable)
        await db.delete(schema.products).where(eq(schema.products.tenantId, tenantId));
        await db.delete(schema.customers).where(eq(schema.customers.tenantId, tenantId));
        await db.delete(schema.suppliers).where(eq(schema.suppliers.tenantId, tenantId));
        await db.delete(schema.accounts).where(eq(schema.accounts.tenantId, tenantId));

        // 4. Logs
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
