"use server";

import { db } from "@/db";
import { purchaseInvoices, purchaseInvoiceItems, products, accounts, journalEntries, journalLines } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, desc, sql, and, or, like } from "drizzle-orm";
import { getSession } from "@/features/auth/actions";
import { createJournalEntry } from "@/features/accounting/actions";

export async function getPurchaseInvoices() {
    const session = await getSession();
    if (!session) return [];

    try {
        const data = await db.query.purchaseInvoices.findMany({
            where: eq(purchaseInvoices.tenantId, session.tenantId),
            orderBy: [desc(purchaseInvoices.issueDate)],
            with: {
                supplier: true,
                items: true,
            }
        });
        return data;
    } catch (e) {
        console.error("Error fetching purchase invoices", e);
        return [];
    }
}

export async function getPurchaseInvoiceById(id: number) {
    console.log("FETCHING_INVOICE_BY_ID:", id);
    const session = await getSession();
    if (!session) return null;

    try {
        const data = await db.query.purchaseInvoices.findFirst({
            where: eq(purchaseInvoices.id, id),
            with: {
                items: true,
            }
        });
        console.log("INVOICE_FETCH_RESULT:", data ? "SUCCESS" : "NOT_FOUND");
        return data;
    } catch (e) {
        console.error("Error fetching purchase invoice", e);
        return null;
    }
}

export async function createPurchaseInvoice(data: any) {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    try {
        // ---------------------------------------------------------
        // Sequential execution for SQLite compatibility
        // ---------------------------------------------------------

        // 1. Create Invoice
        const [invoice] = await db.insert(purchaseInvoices).values({
            tenantId: session.tenantId,
            supplierId: data.supplierId ? parseInt(data.supplierId) : null,
            supplierName: data.supplierName,
            invoiceNumber: data.invoiceNumber || `PUR-${Date.now().toString().slice(-6)}`,
            issueDate: data.issueDate,
            paymentStatus: data.paymentStatus || 'unpaid',
            amountPaid: (data.amountPaid || 0).toString(),
            status: 'posted', // Automatically affect stock
            totalAmount: data.totalAmount.toString(),
            subtotal: data.subtotal.toString(),
            // @ts-ignore
            createdBy: session.userId,
        }).returning();

        // 2. Insert Items & Update Stock
        for (const item of data.items) {
            await db.insert(purchaseInvoiceItems).values({
                purchaseInvoiceId: invoice.id,
                productId: item.productId ? parseInt(item.productId) : null,
                description: item.description,
                quantity: item.quantity.toString(),
                unitCost: item.unitCost.toString(),
                total: item.total.toString(),
            });

            // Update Product Stock & Average Cost
            if (item.productId) {
                const pId = parseInt(item.productId);
                const [product] = await db.select().from(products).where(eq(products.id, pId));

                if (product) {
                    const oldQty = parseFloat(product.stockQuantity || "0");
                    const newQty = parseFloat(item.quantity);
                    const oldCost = parseFloat(product.buyPrice || "0");
                    const newCost = parseFloat(item.unitCost);

                    const totalQty = oldQty + newQty;

                    // Weighted Average Cost
                    let avgCost = newCost;
                    if (totalQty > 0) {
                        avgCost = ((oldQty * oldCost) + (newQty * newCost)) / totalQty;
                    }

                    await db.update(products).set({
                        stockQuantity: totalQty.toString(),
                        buyPrice: avgCost.toFixed(2),
                    }).where(eq(products.id, pId));
                }
            }
        }

        // 3. Accounting Entries
        try {
            // A. Find or Create Purchases Account (Expense)
            let purchaseAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, session.tenantId), or(like(accounts.name, '%مشتريات%'), like(accounts.name, '%Purchase%')))
            });
            if (!purchaseAcc) {
                const [newAcc] = await db.insert(accounts).values({
                    tenantId: session.tenantId,
                    name: "حساب المشتريات (تلقائي)",
                    code: `501-${Date.now().toString().slice(-4)}`,
                    type: 'expense',
                    balance: '0'
                }).returning();
                purchaseAcc = newAcc;
            }

            // B. Find or Create Supplier Account (Liability) - SPECIFIC to this supplier name
            let supplierAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, session.tenantId), eq(accounts.name, data.supplierName))
            });
            if (!supplierAcc) {
                const [newAcc] = await db.insert(accounts).values({
                    tenantId: session.tenantId,
                    name: data.supplierName,
                    code: `210-${Date.now().toString().slice(-4)}`,
                    type: 'liability',
                    balance: '0'
                }).returning();
                supplierAcc = newAcc;
            }

            // C. Find Cash Account for payments
            const cashAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, session.tenantId), or(like(accounts.name, '%نقدية%'), like(accounts.name, '%خزينة%'), like(accounts.name, '%Cash%')))
            });

            const total = parseFloat(data.totalAmount);
            const paid = parseFloat(data.amountPaid || "0");
            const lines = [];

            // Debit Purchases (Increase Expense)
            lines.push({
                accountId: purchaseAcc.id,
                debit: total,
                credit: 0,
                description: `شراء بضاعة - فاتورة ${invoice.invoiceNumber}`
            });

            // Credit Supplier (Increase Liability)
            lines.push({
                accountId: supplierAcc.id,
                debit: 0,
                credit: total,
                description: `مستحق للمورد - فاتورة ${invoice.invoiceNumber}`
            });

            // If Paid, add payment lines
            if (paid > 0 && cashAcc) {
                // Debit Supplier (Decrease Liability)
                lines.push({
                    accountId: supplierAcc.id,
                    debit: paid,
                    credit: 0,
                    description: `سداد دفعة للمورد - فاتورة ${invoice.invoiceNumber}`
                });
                // Credit Cash (Decrease Asset)
                lines.push({
                    accountId: cashAcc.id,
                    debit: 0,
                    credit: paid,
                    description: `دفع نقدية - فاتورة ${invoice.invoiceNumber}`
                });
            }

            await createJournalEntry({
                date: data.issueDate,
                description: `فاتورة مشتريات رقم ${invoice.invoiceNumber} - ${data.supplierName}`,
                reference: invoice.invoiceNumber,
                lines: lines
            });

        } catch (accErr) {
            console.error("Accounting Entry Failed for Purchase:", accErr);
            // We don't block the whole action if accounting fails, but we log it
        }

        revalidatePath("/dashboard/purchases");
        revalidatePath("/dashboard/inventory");
        revalidatePath("/dashboard/reports/statement");

        return { success: true, invoiceId: invoice.id };
    } catch (error: any) {
        console.error("CRITICAL_ERROR: createPurchaseInvoice failed:", error);
        return { success: false, error: "ACTION_ERROR: " + (error.message || "Unknown error") };
    }
}

export async function createPurchaseReturnInvoice(data: {
    originalInvoiceId: number;
    returnDate: string;
    items: {
        productId: number;
        description: string;
        quantity: number;
        unitCost: number;
    }[];
}) {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    try {
        // 1. Get Original Invoice
        const originalInvoice = await db.query.purchaseInvoices.findFirst({
            where: eq(purchaseInvoices.id, data.originalInvoiceId)
        });

        if (!originalInvoice) throw new Error("Original Invoice not found");

        // Calculate Return Totals
        let subtotal = 0;
        data.items.forEach(item => {
            subtotal += item.quantity * item.unitCost;
        });

        // 2. Create Return Invoice (Negative amounts for reporting)
        const [returnInvoice] = await db.insert(purchaseInvoices).values({
            tenantId: session.tenantId,
            supplierId: originalInvoice.supplierId,
            supplierName: originalInvoice.supplierName,
            invoiceNumber: `RET-${originalInvoice.invoiceNumber}-${Date.now().toString().slice(-4)}`,
            issueDate: data.returnDate,
            paymentStatus: 'paid', // Assuming refund or credit note
            amountPaid: (-subtotal).toString(),
            status: 'posted',
            // @ts-ignore
            type: 'return',
            relatedInvoiceId: originalInvoice.id,
            totalAmount: (-subtotal).toString(),
            subtotal: (-subtotal).toString(),
            createdBy: session.userId,
        }).returning();

        // 3. Insert Items & UPDATE STOCK (Purchase Return = Stock Decrement)
        for (const item of data.items) {
            await db.insert(purchaseInvoiceItems).values({
                purchaseInvoiceId: returnInvoice.id,
                productId: item.productId,
                description: item.description,
                quantity: item.quantity.toString(),
                unitCost: item.unitCost.toString(),
                total: (-item.quantity * item.unitCost).toString(),
            });

            // Decrement Stock
            const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
            const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;
            await db.update(products)
                .set({ stockQuantity: sql`${castNum(products.stockQuantity)} - ${item.quantity}` })
                .where(eq(products.id, item.productId));
        }

        // Update original invoice status
        await db.update(purchaseInvoices)
            .set({ status: 'partially_returned' })
            .where(eq(purchaseInvoices.id, data.originalInvoiceId));

        // 4. Accounting Entries for Return
        try {
            // Find specific Supplier Account
            let supplierAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, session.tenantId), eq(accounts.name, originalInvoice.supplierName))
            });

            // Find Purchases Account
            let purchaseAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, session.tenantId), or(like(accounts.name, '%مشتريات%'), like(accounts.name, '%Purchase%')))
            });

            if (supplierAcc && purchaseAcc) {
                const totalReturn = Math.abs(subtotal);
                const lines = [
                    // Debit Supplier (Decrease Liability)
                    {
                        accountId: supplierAcc.id,
                        debit: totalReturn,
                        credit: 0,
                        description: `مرتجع مشتريات - فاتورة ${originalInvoice.invoiceNumber}`
                    },
                    // Credit Purchases (Decrease Expense)
                    {
                        accountId: purchaseAcc.id,
                        debit: 0,
                        credit: totalReturn,
                        description: `تخفيض تكلفة مشتريات - فاتورة ${originalInvoice.invoiceNumber}`
                    }
                ];

                await createJournalEntry({
                    date: data.returnDate,
                    description: `مرتجع مشتريات فاتورة ${originalInvoice.invoiceNumber} - ${originalInvoice.supplierName}`,
                    reference: returnInvoice.invoiceNumber,
                    lines: lines
                });
            }
        } catch (accErr) {
            console.error("Accounting Entry Failed for Return:", accErr);
        }

        revalidatePath("/dashboard/purchases");
        revalidatePath("/dashboard/inventory");
        revalidatePath("/dashboard/reports/statement");

        return { success: true, message: "تم تسجيل مرتجع المشتريات بنجاح" };
    } catch (e: any) {
        console.error("Purchase Return Error:", e);
        return { success: false, error: e.message || "Failed to create return" };
    }
}

export async function updatePurchaseInvoice(id: number, data: any) {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    try {
        // 1. Get current invoice and items for stock reconciliation
        const oldInvoice = await db.query.purchaseInvoices.findFirst({
            where: eq(purchaseInvoices.id, id),
            with: { items: true }
        });

        if (!oldInvoice) throw new Error("Invoice not found");

        // ---------------------------------------------------------
        // 2. Revert old stock impact
        // ---------------------------------------------------------
        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;
        for (const oldItem of oldInvoice.items) {
            if (oldItem.productId) {
                await db.update(products)
                    .set({ stockQuantity: sql`${castNum(products.stockQuantity)} - ${oldItem.quantity}` })
                    .where(eq(products.id, oldItem.productId));
            }
        }

        // 3. Update Invoice Header
        await db.update(purchaseInvoices).set({
            supplierId: data.supplierId ? parseInt(data.supplierId) : null,
            supplierName: data.supplierName,
            invoiceNumber: data.invoiceNumber || oldInvoice.invoiceNumber,
            issueDate: data.issueDate,
            paymentStatus: data.paymentStatus || 'unpaid',
            amountPaid: (data.amountPaid || 0).toString(),
            totalAmount: data.totalAmount.toString(),
            subtotal: data.subtotal.toString(),
        }).where(eq(purchaseInvoices.id, id));

        // 4. Clear old items
        await db.delete(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.purchaseInvoiceId, id));

        // 5. Insert New Items & Update Stock
        for (const item of data.items) {
            await db.insert(purchaseInvoiceItems).values({
                purchaseInvoiceId: id,
                productId: item.productId ? parseInt(item.productId) : null,
                description: item.description,
                quantity: item.quantity.toString(),
                unitCost: item.unitCost.toString(),
                total: item.total.toString(),
            });

            // Update Product Stock & Average Cost
            if (item.productId) {
                const pId = parseInt(item.productId);
                const [product] = await db.select().from(products).where(eq(products.id, pId));

                if (product) {
                    const oldQty = parseFloat(product.stockQuantity || "0");
                    const newQty = parseFloat(item.quantity);
                    const oldCost = parseFloat(product.buyPrice || "0");
                    const newCost = parseFloat(item.unitCost);

                    const totalQty = oldQty + newQty;

                    // Weighted Average Cost
                    let avgCost = newCost;
                    if (totalQty > 0) {
                        avgCost = ((oldQty * oldCost) + (newQty * newCost)) / totalQty;
                    }

                    await db.update(products).set({
                        stockQuantity: totalQty.toString(),
                        buyPrice: avgCost.toFixed(2),
                    }).where(eq(products.id, pId));
                }
            }
        }

        // 6. Update Accounting
        try {
            // Delete old JE if exists
            const oldJE = await db.query.journalEntries.findFirst({
                where: and(eq(journalEntries.tenantId, session.tenantId), eq(journalEntries.reference, oldInvoice.invoiceNumber || ""))
            });
            if (oldJE) {
                // Delete lines first (cascade should handle it but let's be safe)
                await db.delete(journalLines).where(eq(journalLines.journalEntryId, oldJE.id));
                await db.delete(journalEntries).where(eq(journalEntries.id, oldJE.id));
            }

            // Create New JE (Re-using logic from createPurchaseInvoice)
            let purchaseAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, session.tenantId), or(like(accounts.name, '%مشتريات%'), like(accounts.name, '%Purchase%')))
            });
            if (!purchaseAcc) {
                const [newAcc] = await db.insert(accounts).values({
                    tenantId: session.tenantId,
                    name: "حساب المشتريات (تلقائي)",
                    code: `501-${Date.now().toString().slice(-4)}`,
                    type: 'expense',
                    balance: '0'
                }).returning();
                purchaseAcc = newAcc;
            }

            let supplierAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, session.tenantId), eq(accounts.name, data.supplierName))
            });
            if (!supplierAcc) {
                const [newAcc] = await db.insert(accounts).values({
                    tenantId: session.tenantId,
                    name: data.supplierName,
                    code: `210-${Date.now().toString().slice(-4)}`,
                    type: 'liability',
                    balance: '0'
                }).returning();
                supplierAcc = newAcc;
            }

            const cashAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, session.tenantId), or(like(accounts.name, '%نقدية%'), like(accounts.name, '%خزينة%'), like(accounts.name, '%Cash%')))
            });

            const total = parseFloat(data.totalAmount);
            const paid = parseFloat(data.amountPaid || "0");
            const lines = [];

            lines.push({ accountId: purchaseAcc.id, debit: total, credit: 0, description: `تعديل شراء - فاتورة ${data.invoiceNumber}` });
            lines.push({ accountId: supplierAcc.id, debit: 0, credit: total, description: `تعديل مديونية - فاتورة ${data.invoiceNumber}` });

            if (paid > 0 && cashAcc) {
                lines.push({ accountId: supplierAcc.id, debit: paid, credit: 0, description: `تعديل سداد - فاتورة ${data.invoiceNumber}` });
                lines.push({ accountId: cashAcc.id, debit: 0, credit: paid, description: `تعديل دفع نقدية - فاتورة ${data.invoiceNumber}` });
            }

            await createJournalEntry({
                date: data.issueDate,
                description: `تعديل فاتورة مشتريات رقم ${data.invoiceNumber} - ${data.supplierName}`,
                reference: data.invoiceNumber,
                lines: lines
            });

        } catch (accErr) {
            console.error("Accounting update failed:", accErr);
        }

        revalidatePath("/dashboard/purchases");
        revalidatePath("/dashboard/inventory");
        revalidatePath("/dashboard/reports/statement");

        return { success: true };
    } catch (error: any) {
        console.error("updatePurchaseInvoice failed:", error);
        return { success: false, error: error.message || "Unknown error" };
    }
}