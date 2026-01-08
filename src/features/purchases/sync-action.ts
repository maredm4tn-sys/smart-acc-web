
"use server";

import { db } from "@/db";
import { purchaseInvoices, purchaseInvoiceItems, journalEntries, journalLines, accounts } from "@/db/schema";
import { eq, and, or, like } from "drizzle-orm";
import { createJournalEntry } from "@/features/accounting/actions";
import { revalidatePath } from "next/cache";

/**
 * Repairs missing journal entries for ALL purchase invoices.
 * Useful for migrating legacy data or fixing synchronization issues.
 */
export async function syncAllPurchasesToLedger() {
    try {
        const invoices = await db.query.purchaseInvoices.findMany({
            with: { items: true }
        });

        let fixedCount = 0;
        let skippedCount = 0;

        for (const invoice of invoices) {
            // Check if JE already exists for this invoice reference
            const existingJE = await db.query.journalEntries.findFirst({
                where: and(
                    eq(journalEntries.tenantId, invoice.tenantId),
                    eq(journalEntries.reference, invoice.invoiceNumber || "")
                )
            });

            if (existingJE) {
                skippedCount++;
                continue;
            }

            // --- Logic from createPurchaseInvoice to generate missing JE ---

            // 1. Find or Create Purchases Account
            let purchaseAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, invoice.tenantId), or(like(accounts.name, '%مشتريات%'), like(accounts.name, '%Purchase%')))
            });
            if (!purchaseAcc) {
                const [newAcc] = await db.insert(accounts).values({
                    tenantId: invoice.tenantId,
                    name: "حساب المشتريات (تلقائي)",
                    code: `501-${Date.now().toString().slice(-4)}`,
                    type: 'expense',
                    balance: '0'
                }).returning();
                purchaseAcc = newAcc;
            }

            // 2. Find or Create Supplier Account
            let supplierAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, invoice.tenantId), eq(accounts.name, invoice.supplierName))
            });
            if (!supplierAcc) {
                const [newAcc] = await db.insert(accounts).values({
                    tenantId: invoice.tenantId,
                    name: invoice.supplierName,
                    code: `210-${Date.now().toString().slice(-4)}`,
                    type: 'liability',
                    balance: '0'
                }).returning();
                supplierAcc = newAcc;
            }

            // 3. Find Cash Account
            const cashAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, invoice.tenantId), or(like(accounts.name, '%نقدية%'), like(accounts.name, '%خزينة%'), like(accounts.name, '%Cash%')))
            });

            const total = parseFloat(invoice.totalAmount || "0");
            const paid = parseFloat(invoice.amountPaid || "0");
            const lines = [];

            if (total > 0) {
                lines.push({ accountId: purchaseAcc.id, debit: total, credit: 0, description: `استيراد شراء - فاتورة ${invoice.invoiceNumber}` });
                lines.push({ accountId: supplierAcc.id, debit: 0, credit: total, description: `استيراد مديونية - فاتورة ${invoice.invoiceNumber}` });
            }

            if (paid > 0 && cashAcc) {
                lines.push({ accountId: supplierAcc.id, debit: paid, credit: 0, description: `استيراد سداد - فاتورة ${invoice.invoiceNumber}` });
                lines.push({ accountId: cashAcc.id, debit: 0, credit: paid, description: `استيراد دفع نقدية` });
            }

            if (lines.length > 0) {
                await createJournalEntry({
                    date: invoice.issueDate,
                    description: `مزامنة آلية لفاتورة رقم ${invoice.invoiceNumber} - ${invoice.supplierName}`,
                    reference: invoice.invoiceNumber,
                    lines: lines
                });
                fixedCount++;
            }
        }

        revalidatePath("/dashboard/reports/statement");
        return { success: true, message: `تمت المزامنة بنجاح: تم إصلاح ${fixedCount} فواتير، وتخطي ${skippedCount} موجودة مسبقاً.` };
    } catch (e: any) {
        console.error("Sync Error:", e);
        return { success: false, error: e.message };
    }
}
