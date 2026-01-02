"use server";

import { db } from "@/db";
import { invoices, invoiceItems, products, journalEntries, journalLines, accounts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type CreateInvoiceInput = {
    customerName: string;
    issueDate: string;
    dueDate?: string;
    currency: string;
    exchangeRate: number;
    includeTax: boolean; // New field
    items: {
        productId: number;
        description: string;
        quantity: number;
        unitPrice: number;
    }[];
    tenantId: string;
};

import { getDictionary } from "@/lib/i18n-server";

export async function createInvoice(data: CreateInvoiceInput) {
    const dict = await getDictionary();
    try {
        // Calculate totals
        let subtotal = 0;
        data.items.forEach(item => {
            subtotal += item.quantity * item.unitPrice;
        });
        const taxRate = data.includeTax ? 0.14 : 0; // Egypt VAT 14%
        const taxTotal = subtotal * taxRate;
        const totalAmount = subtotal + taxTotal;

        // Ensure valid Tenant ID
        const { getActiveTenantId } = await import("@/lib/actions-utils");
        const tenantId = await getActiveTenantId(data.tenantId);

        // 1. Create Invoice
        const [newInvoice] = await db.insert(invoices).values({
            tenantId: tenantId,
            invoiceNumber: `INV-${Date.now().toString().slice(-6)}`, // Simple auto-gen
            customerName: data.customerName,
            issueDate: data.issueDate,
            dueDate: data.dueDate,
            currency: data.currency,
            exchangeRate: data.exchangeRate.toString(),
            subtotal: subtotal.toString(),
            taxTotal: taxTotal.toString(),
            totalAmount: totalAmount.toString(),
            status: "issued",
        }).returning();

        // 2. Create Invoice Items & Update Stock
        for (const item of data.items) {
            await db.insert(invoiceItems).values({
                invoiceId: newInvoice.id,
                productId: item.productId,
                description: item.description,
                quantity: item.quantity.toString(),
                unitPrice: item.unitPrice.toString(),
                total: (item.quantity * item.unitPrice).toString(),
            });

            // Update Mock Stock (Decrement)
            // Note: In real app use transaction and atomic update
            await db.update(products)
                .set({ stockQuantity: sql`${products.stockQuantity} - ${item.quantity}` })
                .where(eq(products.id, item.productId));
        }

        // 3. Auto-Create Journal Entry (Sales)
        // Find Cash Account (Using like search for robustness in demo)
        const cashAccount = await db.query.accounts.findFirst({
            where: (accounts, { like }) => like(accounts.name, '%نقدية%')
        });
        const salesAccount = await db.query.accounts.findFirst({
            where: (accounts, { like }) => like(accounts.name, '%مبيعات%')
        });

        // Only if accounts exist (fallback for demo)
        if (cashAccount && salesAccount) {
            const { createJournalEntry } = await import("@/features/accounting/actions");

            // Convert to Base Currency (EGP) for GL
            const rate = data.exchangeRate || 1;
            const baseTotalAmount = totalAmount * rate;
            const baseSubtotal = subtotal * rate;
            const baseTaxTotal = taxTotal * rate;

            await createJournalEntry({
                tenantId: tenantId,
                date: data.issueDate,
                reference: newInvoice.invoiceNumber,
                description: `فاتورة مبيعات رقم ${newInvoice.invoiceNumber} - ${data.customerName}`,
                currency: data.currency,
                exchangeRate: data.exchangeRate,
                lines: [
                    {
                        accountId: cashAccount.id,
                        debit: baseTotalAmount,
                        credit: 0,
                        description: `تحصيل فاتورة ${newInvoice.invoiceNumber}`
                    },
                    {
                        accountId: salesAccount.id,
                        debit: 0,
                        credit: baseSubtotal,
                        description: `إيراد مبيعات ${newInvoice.invoiceNumber}`
                    },
                    // VAT Part
                    ...(baseTaxTotal > 0 ? [{
                        accountId: salesAccount.id,
                        debit: 0,
                        credit: baseTaxTotal,
                        description: "ضريبة القيمة المضافة sales tax"
                    }] : [])
                ]
            });
        }

        try {
            revalidatePath("/dashboard/sales");
        } catch (e) { }
        return { success: true, message: dict.Sales.Invoice.Success, id: newInvoice.id };
    } catch (error) {
        console.error("Error creating invoice:", error);
        return { success: false, message: dict.Sales.Invoice.Error };
    }
}
