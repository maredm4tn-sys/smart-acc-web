"use server";

import { db } from "@/db";
import { installments, invoices, accounts, customers } from "@/db/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/tenant-security";
import { getDictionary } from "@/lib/i18n-server";
import { createJournalEntry } from "@/features/accounting/actions";

export async function getInstallments(filters?: { customerId?: number, status?: string, thisMonth?: boolean }) {
    try {
        const tenantId = await requireTenant();

        const query = db.select({
            id: installments.id,
            dueDate: installments.dueDate,
            amount: installments.amount,
            amountPaid: installments.amountPaid,
            status: installments.status,
            paidDate: installments.paidDate,
            notes: installments.notes,
            invoiceId: installments.invoiceId,
            customerName: customers.name,
            invoiceNumber: invoices.invoiceNumber,
        })
            .from(installments)
            .innerJoin(customers, eq(installments.customerId, customers.id))
            .innerJoin(invoices, eq(installments.invoiceId, invoices.id))
            .where(eq(installments.tenantId, tenantId))
            .orderBy(asc(installments.dueDate));

        // Filtering logic can be added here if needed

        return await query;
    } catch (e) {
        console.error("Error fetching installments:", e);
        return [];
    }
}

export async function payInstallment(id: number, paymentDate: string) {
    const dict = await getDictionary();
    try {
        const tenantId = await requireTenant();

        return await db.transaction(async (tx) => {
            // 1. Get Installment details
            const inst = await tx.query.installments.findFirst({
                where: and(eq(installments.id, id), eq(installments.tenantId, tenantId)),
                with: {
                    invoice: true,
                    customer: true
                }
            });

            if (!inst || inst.status === 'paid') {
                return { success: false, message: "Installment not found or already paid" };
            }

            const amount = Number(inst.amount);

            // 2. Update Installment
            await tx.update(installments).set({
                status: 'paid',
                amountPaid: inst.amount,
                paidDate: paymentDate,
            }).where(and(eq(installments.id, id), eq(installments.tenantId, tenantId)));

            // 3. Update Invoice
            const currentInvoicePaid = Number(inst.invoice?.amountPaid || 0);
            const newInvoicePaid = currentInvoicePaid + amount;

            await tx.update(invoices).set({
                amountPaid: newInvoicePaid.toFixed(2),
            }).where(and(eq(invoices.id, inst.invoiceId), eq(invoices.tenantId, tenantId)));

            // 4. Create Journal Entry
            const cashAccount = await tx.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, tenantId), sql`${accounts.name} LIKE '%نقدية%' OR ${accounts.name} LIKE '%Cash%'`)
            });

            const arAccount = await tx.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, tenantId), sql`${accounts.name} LIKE '%عملاء%' OR ${accounts.name} LIKE '%Receivable%'`)
            });

            if (cashAccount && arAccount) {
                await createJournalEntry({
                    date: paymentDate,
                    reference: `INST-${inst.id}`,
                    description: `تحصيل قسط من العميل ${inst.customer?.name} - فاتورة ${inst.invoice?.invoiceNumber}`,
                    lines: [
                        {
                            accountId: cashAccount.id,
                            debit: amount,
                            credit: 0,
                            description: `تحصيل قسط - ${inst.customer?.name}`
                        },
                        {
                            accountId: arAccount.id,
                            debit: 0,
                            credit: amount,
                            description: `سداد قسط من حساب العميل`
                        }
                    ]
                }, tx);
            }

            revalidatePath("/dashboard/installments");
            return { success: true, message: dict.Common.Success };
        });
    } catch (e: any) {
        console.error("Error paying installment:", e);
        return { success: false, message: e.message || "Error" };
    }
}
