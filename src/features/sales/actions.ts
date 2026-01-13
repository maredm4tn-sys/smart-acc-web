"use server";

import { db } from "@/db";
import { invoices, invoiceItems, products, journalEntries, journalLines, accounts, installments, customers } from "@/db/schema";
import { eq, and, sql, or, like, desc, inArray, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/tenant-security";
import { getSession } from "@/features/auth/actions";

type CreateInvoiceInput = {
    customerName: string;
    customerId?: number | null; // Added
    issueDate: string;
    dueDate?: string;
    currency: string;
    exchangeRate: number;
    includeTax: boolean;
    representativeId?: number | null;
    items: {
        productId: number;
        description: string;
        quantity: number;
        unitPrice: number;
        unitId?: number | null; // Added
        storeId?: number | null; // Added
        discount?: number; // Added
    }[];
    discountAmount?: number;
    discountPercent?: number; // Added
    deliveryFee?: number; // Added
    paymentMethod?: string;
    tenantId?: string;
    // POS Fields
    priceType?: string; // Added
    storeId?: number; // Added

    // Installment Fields
    isInstallment?: boolean;
    installmentCount?: number;
    installmentInterest?: number;
};

import { z } from "zod";
import { getDictionary } from "@/lib/i18n-server";
import { createJournalEntry } from "@/features/accounting/actions";
import { getActiveShift } from "@/features/shifts/actions";

const createInvoiceSchema = z.object({
    customerName: z.string().min(1),
    customerId: z.number().nullable().optional(),
    issueDate: z.string().min(1),
    dueDate: z.string().optional(),
    currency: z.string(),
    exchangeRate: z.number().positive(),
    includeTax: z.boolean(),
    items: z.array(z.object({
        productId: z.number(),
        description: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
        unitId: z.number().nullable().optional(),
        storeId: z.number().nullable().optional(),
        discount: z.number().nonnegative().optional()
    })).min(1),
    discountAmount: z.number().nonnegative().optional(),
    discountPercent: z.number().nonnegative().optional(),
    deliveryFee: z.number().nonnegative().optional(),
    paymentMethod: z.string().optional(),
    tenantId: z.string().optional(),
    priceType: z.string().optional(),
    storeId: z.number().optional(),
    isInstallment: z.boolean().optional(),
    installmentCount: z.number().min(0).optional(),
    installmentInterest: z.number().min(0).optional(),
    representativeId: z.number().optional().nullable(),
});


export async function createInvoice(inputData: CreateInvoiceInput & { initialPayment?: number }) {
    const dict = await getDictionary();

    // Secure Input Validation with Zod
    const extendedSchema = createInvoiceSchema.extend({
        initialPayment: z.number().nonnegative().optional()
    });

    const validation = extendedSchema.safeParse(inputData);
    if (!validation.success) {
        console.error("Validation Error:", validation.error);
        return { success: false as const, message: dict.Common.Error };
    }
    const data = validation.data;

    try {
        const tenantId = await requireTenant();

        // --- License Check (TRIAL) ---
        const { getLicenseStatus } = await import("@/lib/license-check");
        const license = await getLicenseStatus();
        if (license.isExpired && !license.isActivated) {
            return {
                success: false as const,
                message: dict?.Common?.TrialExpired || "Trial Version Expired. Please activate the full version."
            };
        }

        // Calculate totals
        let subtotal = 0;
        data.items.forEach(item => {
            const lineTotal = (item.quantity * item.unitPrice) - (item.discount || 0);
            subtotal += lineTotal;
        });

        // Bill Level Discount
        const billDiscountAmount = data.discountAmount || 0;
        const billDiscountPercentVal = data.discountPercent ? (subtotal * data.discountPercent / 100) : 0;
        const totalDiscount = billDiscountAmount + billDiscountPercentVal;

        const netSubtotal = Math.max(0, subtotal - totalDiscount);

        const taxRate = data.includeTax ? 0.14 : 0;
        const taxTotal = netSubtotal * taxRate;
        const delivery = data.deliveryFee || 0;

        let totalAmount = netSubtotal + taxTotal + delivery;

        // --- Installment Logic ---
        let installmentMonthlyAmount = 0;
        if (data.isInstallment && (data.installmentInterest || 0) > 0) {
            const interest = totalAmount * ((data.installmentInterest || 0) / 100);
            totalAmount += interest;
        }

        if (data.isInstallment && (data.installmentCount || 0) > 0) {
            const paidNow = data.initialPayment || 0;
            const remaining = totalAmount - paidNow;
            installmentMonthlyAmount = remaining / (data.installmentCount || 1);
        }

        // Determine Payment Status
        let paymentStatus: 'paid' | 'unpaid' | 'partial' = 'unpaid';
        const paidAmount = data.initialPayment || 0;
        if (paidAmount >= totalAmount - 0.01) paymentStatus = 'paid';
        else if (paidAmount > 0) paymentStatus = 'partial';

        // 1. Prepare Data & Check Token Requirement
        const formattedDate = data.issueDate.includes('T') ? data.issueDate.split('T')[0] : data.issueDate;
        const formattedDueDate = data.dueDate ? (data.dueDate.includes('T') ? data.dueDate.split('T')[0] : data.dueDate) : undefined;

        // Fetch involved products to check type and token requirement
        const productIds = data.items.map(i => i.productId);
        const involvedProducts = await db.select({
            id: products.id,
            type: products.type,
            requiresToken: products.requiresToken,
            categoryId: products.categoryId
        })
            .from(products)
            .where(inArray(products.id, productIds));

        // Calculate Token Number if needed
        let tokenNumber: number | undefined = undefined;
        const needsToken = involvedProducts.some(p => p.requiresToken);

        if (needsToken) {
            const tokenItem = involvedProducts.find(p => p.requiresToken);
            const tokenCategoryId = tokenItem?.categoryId;

            if (tokenCategoryId) {
                const countResult = await db.select({ count: sql<number>`count(distinct ${invoices.id})` })
                    .from(invoices)
                    .innerJoin(invoiceItems, eq(invoices.id, invoiceItems.invoiceId))
                    .innerJoin(products, eq(invoiceItems.productId, products.id))
                    .where(
                        and(
                            eq(invoices.tenantId, tenantId),
                            eq(invoices.issueDate, formattedDate),
                            isNotNull(invoices.tokenNumber),
                            eq(products.categoryId, tokenCategoryId)
                        )
                    );
                tokenNumber = (Number(countResult[0]?.count) || 0) + 1;
            } else {
                const globalResult = await db.select({ count: sql<number>`count(*)` })
                    .from(invoices)
                    .where(and(
                        eq(invoices.tenantId, tenantId),
                        eq(invoices.issueDate, formattedDate),
                        isNotNull(invoices.tokenNumber)
                    ));
                tokenNumber = (Number(globalResult[0]?.count) || 0) + 1;
            }
        }

        const session = await getSession();
        const [newInvoice] = await db.insert(invoices).values({
            tenantId: tenantId,
            invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
            customerName: data.customerName,
            customerId: data.customerId, // Added
            representativeId: data.representativeId,
            issueDate: formattedDate,
            dueDate: formattedDueDate,
            currency: data.currency,
            exchangeRate: data.exchangeRate.toString(),
            subtotal: subtotal.toFixed(2),
            taxTotal: taxTotal.toFixed(2),
            discountAmount: totalDiscount.toFixed(2), // Total discount (amount + %)
            discountPercent: data.discountPercent?.toString(),
            deliveryFee: delivery.toFixed(2),
            paymentMethod: data.paymentMethod || "cash",
            totalAmount: totalAmount.toFixed(2),
            amountPaid: Number(paidAmount).toFixed(2),
            paymentStatus: paymentStatus,
            status: "issued",
            priceType: data.priceType || 'retail',
            storeId: data.storeId || 1,
            tokenNumber: tokenNumber,
            createdBy: session?.userId,
            shiftId: (await getActiveShift())?.id,
            isInstallment: !!data.isInstallment,
            installmentDownPayment: Number(data.initialPayment || 0).toFixed(2),
            installmentCount: data.installmentCount,
            installmentInterest: Number(data.installmentInterest || 0).toFixed(2),
            installmentMonthlyAmount: installmentMonthlyAmount.toFixed(2),
        }).returning();

        // 2. Create Invoice Items & Update Stock
        for (const item of data.items) {
            await db.insert(invoiceItems).values({
                invoiceId: newInvoice.id,
                productId: item.productId,
                description: item.description,
                quantity: Number(item.quantity).toFixed(2),
                unitPrice: Number(item.unitPrice).toFixed(2),
                unitId: item.unitId,
                storeId: item.storeId,
                discount: (item.discount || 0).toFixed(2),
                total: ((item.quantity * item.unitPrice) - (item.discount || 0)).toFixed(2),
            });

            // Decrement Stock ONLY for 'goods'
            const pInfo = involvedProducts.find(p => p.id === item.productId);
            if (pInfo?.type === 'goods') {
                const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
                const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;
                await db.update(products)
                    .set({ stockQuantity: sql`${castNum(products.stockQuantity)} - ${item.quantity}` })
                    .where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));
            }
        }

        // 2.1 CREATE INSTALLMENT SCHEDULE
        if (data.isInstallment && (data.installmentCount || 0) > 0) {
            // Find Customer ID by name
            const customerObj = await db.query.customers.findFirst({
                where: and(eq(customers.name, data.customerName), eq(customers.tenantId, tenantId))
            });

            if (customerObj) {
                const count = data.installmentCount || 0;
                const startDate = new Date(formattedDate);

                for (let i = 1; i <= count; i++) {
                    const dueDate = new Date(startDate);
                    dueDate.setMonth(dueDate.getMonth() + i);

                    await db.insert(installments).values({
                        tenantId: tenantId,
                        customerId: customerObj.id,
                        invoiceId: newInvoice.id,
                        dueDate: dueDate.toISOString().split('T')[0],
                        amount: installmentMonthlyAmount.toFixed(2),
                        amountPaid: "0.00",
                        status: "unpaid",
                    });
                }
            }
        }

        // 3. Auto-Create Journal Entry
        // Find OR Create Accounts
        let cashAccount = await db.query.accounts.findFirst({
            where: (accounts, { like, and, eq, or }) => and(
                eq(accounts.tenantId, tenantId),
                or(like(accounts.name, '%نقدية%'), like(accounts.name, '%Cash%'), like(accounts.name, '%Treasury%'))
            )
        });
        if (!cashAccount) {
            // Create Cash Account
            const [newCash] = await db.insert(accounts).values({
                tenantId,
                name: "النقدية (تلقائي)",
                code: `101-${Date.now().toString().slice(-4)}`,
                type: 'asset',
                currency: 'EGP',
                balance: '0'
            }).returning();
            cashAccount = newCash;
        }

        let salesAccount = await db.query.accounts.findFirst({
            where: (accounts, { like, and, eq, or }) => and(
                eq(accounts.tenantId, tenantId),
                or(like(accounts.name, '%مبيعات%'), like(accounts.name, '%Sales%'), like(accounts.name, '%Revenue%'))
            )
        });
        if (!salesAccount) {
            // Create Sales Account
            const [newSales] = await db.insert(accounts).values({
                tenantId,
                name: "إيرادات المبيعات (تلقائي)",
                code: `401-${Date.now().toString().slice(-4)}`,
                type: 'revenue',
                currency: 'EGP',
                balance: '0'
            }).returning();
            salesAccount = newSales;
        }

        let arAccount = await db.query.accounts.findFirst({
            where: (accounts, { like, and, eq, or }) => and(
                eq(accounts.tenantId, tenantId),
                or(like(accounts.name, '%عملاء%'), like(accounts.name, '%Receivable%'), like(accounts.name, '%Customer%'))
            )
        });
        if (!arAccount) {
            // Create AR Account
            const [newAR] = await db.insert(accounts).values({
                tenantId,
                name: "العملاء (تلقائي)",
                code: `102-${Date.now().toString().slice(-4)}`,
                type: 'asset',
                currency: 'EGP',
                balance: '0'
            }).returning();
            arAccount = newAR;
        }

        let discountAccount = await db.query.accounts.findFirst({
            where: (accounts, { like, and, eq, or }) => and(
                eq(accounts.tenantId, tenantId),
                or(like(accounts.name, '%خصم مسموح%'), like(accounts.name, '%Discount%'))
            )
        });
        if (!discountAccount) {
            const [newDisc] = await db.insert(accounts).values({
                tenantId,
                name: "الخصم المسموح به (تلقائي)",
                code: `505-${Date.now().toString().slice(-4)}`,
                type: 'expense',
                currency: 'EGP',
                balance: '0'
            }).returning();
            discountAccount = newDisc;
        }

        if (salesAccount) {
            // Using static import logic
            const rate = data.exchangeRate || 1;
            const baseTotalAmount = totalAmount * rate;
            const baseSubtotal = subtotal * rate;
            const baseTaxTotal = taxTotal * rate;
            const basePaid = paidAmount * rate;
            const baseRemaining = baseTotalAmount - basePaid;

            const lines = [];

            // Credit Sales
            lines.push({
                accountId: salesAccount.id,
                debit: 0,
                credit: baseSubtotal,
                description: `إيراد مبيعات فاتورة ${newInvoice.invoiceNumber}`
            });

            // Credit Tax
            if (baseTaxTotal > 0) {
                lines.push({
                    accountId: salesAccount.id,
                    debit: 0,
                    credit: baseTaxTotal,
                    description: "ضريبة القيمة المضافة"
                });
            }

            // Debit Cash
            if (basePaid > 0 && cashAccount) {
                lines.push({
                    accountId: cashAccount.id,
                    debit: basePaid,
                    credit: 0,
                    description: `تحصيل من فاتورة ${newInvoice.invoiceNumber}`
                });
            }

            // Debit AR
            if (baseRemaining > 0.01) {
                if (arAccount) {
                    lines.push({
                        accountId: arAccount.id,
                        debit: baseRemaining,
                        credit: 0,
                        description: `مديونية عملاء - فاتورة ${newInvoice.invoiceNumber}`
                    });
                } else {
                    console.warn("No AR Account found for credit sale!");
                }
            }

            // Debit Discount (Accounting Assurance Fix)
            if (totalDiscount > 0 && discountAccount) {
                lines.push({
                    accountId: discountAccount.id,
                    debit: totalDiscount * rate,
                    credit: 0,
                    description: `خصم مسموح به - فاتورة ${newInvoice.invoiceNumber}`
                });
            }

            const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
            const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

            if (Math.abs(totalDebit - totalCredit) < 0.1) {
                const jeResult = await createJournalEntry({
                    date: data.issueDate,
                    reference: newInvoice.invoiceNumber,
                    description: `فاتورة مبيعات رقم ${newInvoice.invoiceNumber} - ${data.customerName}`,
                    currency: data.currency,
                    exchangeRate: data.exchangeRate,
                    lines: lines
                }); // Removed tx argument, passing undefined to use global db

                if (!jeResult.success) {
                    console.error("Auto-Journal Entry Failed:", jeResult.message);
                    return {
                        success: true as const,
                        message: `${dict.Sales.Invoice.Success} (تنبيه: فشل إنشاء القيد المحاسبي: ${jeResult.message})`,
                        id: Number(newInvoice.id)
                    };
                }
            } else {
                console.warn("Unbalanced Journal Entry ignored");
            }
        }

        // Removed revalidatePath to prevent Electron connection reset issues.

        // FIX: Only return primitives
        return {
            success: true as const,
            message: dict.Sales.Invoice.Success,
            id: Number(newInvoice.id),
            tokenNumber: tokenNumber
        };

    } catch (error: any) {
        console.error("Error creating invoice:", error);
        const detail = error.detail ? ` - ${error.detail}` : "";
        const code = error.code ? ` (Code: ${error.code})` : "";
        return {
            success: false as const,
            message: `Server Error: ${error.message || String(error)}${detail}${code}`
        };
    }
}



const recordPaymentSchema = z.object({
    invoiceId: z.number(),
    amount: z.number().positive(),
    date: z.string(),
    reference: z.string().optional(),
    tenantId: z.string().optional()
});

export async function recordPayment(inputData: z.infer<typeof recordPaymentSchema>) {
    const dict = await getDictionary();
    const validation = recordPaymentSchema.safeParse(inputData);
    if (!validation.success) return { success: false, message: dict.Common.Error };

    const data = validation.data;

    try {
        const tenantId = await requireTenant(); // Strict Tenant

        return await db.transaction(async (tx) => {
            // 1. Get Invoice
            const invoice = await tx.query.invoices.findFirst({
                where: (inv, { eq, and }) => and(eq(inv.id, data.invoiceId), eq(inv.tenantId, tenantId)) // Added tenant scope
            });

            if (!invoice) throw new Error("Invoice not found");

            const currentPaid = Number(invoice.amountPaid || 0);
            const total = Number(invoice.totalAmount);
            const remaining = total - currentPaid;

            if (data.amount > remaining + 0.1) { // small buffer
                return { success: false, message: dict.Sales.Invoice.Form.Errors.AmountExceeds };
            }

            const newPaid = currentPaid + data.amount;
            let newStatus: 'paid' | 'partial' | 'unpaid' = 'partial';
            if (newPaid >= total - 0.1) newStatus = 'paid';

            // 2. Update Invoice
            await tx.update(invoices).set({
                amountPaid: newPaid.toString(),
                paymentStatus: newStatus,
                status: newStatus === 'paid' ? 'paid' : 'issued' // Update main status too if paid
            }).where(eq(invoices.id, invoice.id));

            // 3. Create Journal Entry (Cash Debit, AR Credit)
            // Find Accounts (Re-using logic, ideal to refactor to helper)
            const cashAccount = await tx.query.accounts.findFirst({
                where: (accounts, { like, and, eq }) => and(eq(accounts.tenantId, tenantId), like(accounts.name, '%نقدية%'))
            });
            const arAccount = await tx.query.accounts.findFirst({
                where: (accounts, { like, and, eq }) => and(eq(accounts.tenantId, tenantId), like(accounts.name, '%عملاء%'))
            });

            if (cashAccount && arAccount) {
                const { createJournalEntry } = await import("@/features/accounting/actions");
                const exchangeRate = Number(invoice.exchangeRate) || 1;
                const baseAmount = data.amount * exchangeRate;

                await createJournalEntry({
                    date: data.date,
                    reference: data.reference || `PAY-${invoice.invoiceNumber}`,
                    description: `تحصيل دفعة من فاتورة ${invoice.invoiceNumber}`,
                    lines: [
                        {
                            accountId: cashAccount.id,
                            debit: baseAmount,
                            credit: 0,
                            description: `تحصيل نقدية - فاتورة ${invoice.invoiceNumber}`
                        },
                        {
                            accountId: arAccount.id,
                            debit: 0,
                            credit: baseAmount,
                            description: `سداد عميل - فاتورة ${invoice.invoiceNumber}`
                        }
                    ]
                }, tx);
            }

            revalidatePath("/dashboard/sales");
            revalidatePath("/dashboard/customers");
            return { success: true, message: dict.Common.Success };
        });

    } catch (e) {
        console.error("Error recording payment:", e);
        return { success: false, message: dict.Common.Error };
    }
}


export async function deleteInvoice(id: number) {
    const dict = await getDictionary();
    try {
        const { getSession } = await import("@/features/auth/actions");
        const session = await getSession();
        if (!session || (session.role !== 'admin' && session.role !== 'SUPER_ADMIN')) {
            return { success: false, message: dict.Common.Error };
        }
        const tenantId = await requireTenant();

        const invoice = await db.query.invoices.findFirst({
            where: (inv, { eq, and }) => and(eq(inv.id, id), eq(inv.tenantId, tenantId))
        });

        if (!invoice) return { success: false, message: dict.Common.Error };

        await db.transaction(async (tx) => {
            // 1. Restore Stock
            const items = await tx.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
            const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
            const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;
            for (const item of items) {
                if (item.productId) {
                    await tx.update(products)
                        .set({ stockQuantity: sql`${castNum(products.stockQuantity)} + ${item.quantity}` })
                        .where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));
                }
            }

            // 2. Clear Related Journal Entries (Invoice JE + Payment JEs)
            const relatedJEs = await tx.query.journalEntries.findMany({
                where: and(
                    eq(journalEntries.tenantId, tenantId),
                    or(
                        eq(journalEntries.reference, invoice.invoiceNumber),
                        like(journalEntries.reference, `%${invoice.invoiceNumber}%`)
                    )
                )
            });

            const { deleteJournalEntry } = await import("@/features/accounting/actions");
            for (const je of relatedJEs) {
                await deleteJournalEntry(je.id, tx);
            }

            // 3. Delete Invoice (Items will be deleted if cascade is enabled, but let's be safe)
            await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
            await tx.delete(invoices).where(eq(invoices.id, id));
        });

        revalidatePath("/dashboard/sales");
        revalidatePath("/dashboard/journal");
        revalidatePath("/dashboard/accounts");
        return { success: true, message: dict.Common.Success };
    } catch (e) {
        console.error("Delete Invoice Error:", e);
        return { success: false, message: dict.Common.Error };
    }
}

const createReturnInvoiceSchema = z.object({
    originalInvoiceId: z.number(),
    returnDate: z.string(),
    items: z.array(z.object({
        productId: z.number(),
        description: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
    })).min(1),
    tenantId: z.string().optional()
});

export async function createReturnInvoice(inputData: z.infer<typeof createReturnInvoiceSchema>) {
    const dict = await getDictionary();
    const validation = createReturnInvoiceSchema.safeParse(inputData);
    if (!validation.success) return { success: false, message: "Invalid Data" };

    const data = validation.data;

    try {
        const tenantId = await requireTenant();

        // 1. Get Original Invoice
        const originalInvoice = await db.query.invoices.findFirst({
            where: (inv, { eq, and }) => and(eq(inv.id, data.originalInvoiceId), eq(inv.tenantId, tenantId))
        });

        if (!originalInvoice) throw new Error("Original Invoice not found");

        // Calculate Return Totals
        let subtotal = 0;
        data.items.forEach(item => {
            subtotal += item.quantity * item.unitPrice;
        });

        // Use original exchange rate
        const exchangeRate = Number(originalInvoice.exchangeRate) || 1;

        // Calculate Tax (Proportional) - Assuming flat rate for simplicity or derived from original
        // Better: Check if original had tax. 
        // We will assume 14% if original had tax, or 0.
        const originalSubtotal = Number(originalInvoice.subtotal);
        const originalTax = Number(originalInvoice.taxTotal);
        const taxRate = originalSubtotal > 0 ? (originalTax / originalSubtotal) : 0;

        const taxTotal = subtotal * taxRate;
        const totalAmount = subtotal + taxTotal;

        // 2. Create Return Invoice
        // Note: Amounts are positive, 'type' = 'return' distinguishes it.
        const [returnInvoice] = await db.insert(invoices).values({
            tenantId: tenantId,
            invoiceNumber: `RET-${originalInvoice.invoiceNumber}-${Date.now().toString().slice(-4)}`,
            customerName: originalInvoice.customerName,
            issueDate: data.returnDate,
            dueDate: data.returnDate,
            currency: originalInvoice.currency,
            exchangeRate: originalInvoice.exchangeRate,
            subtotal: (-subtotal).toString(), // Store as negative for financial reporting ease? Or positive?
            // Let's store as NEGATIVE to make summation easier in reports.
            taxTotal: (-taxTotal).toString(),
            totalAmount: (-totalAmount).toString(),
            amountPaid: (-totalAmount).toString(), // Assuming full refund paid or credited immediately
            paymentStatus: 'paid',
            status: "issued",
            type: "return",
            relatedInvoiceId: originalInvoice.id.toString(),
            notes: `مرتجع من فاتورة ${originalInvoice.invoiceNumber}`
        }).returning();

        // 3. Invoice Items & RESTOCK
        for (const item of data.items) {
            await db.insert(invoiceItems).values({
                invoiceId: returnInvoice.id,
                productId: item.productId,
                description: item.description,
                quantity: item.quantity.toString(),
                unitPrice: item.unitPrice.toString(),
                total: (-1 * item.quantity * item.unitPrice).toString(),
            });

            // RESTOCK (Increase Quantity)
            const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
            const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;
            await db.update(products)
                .set({ stockQuantity: sql`${castNum(products.stockQuantity)} + ${item.quantity}` })
                .where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));
        }

        // 4. Accounting Entry (Reverse of Sale)

        // Find OR Create Sales Account
        let salesAccount = await db.query.accounts.findFirst({
            where: (accounts, { like, and, eq, or }) => and(
                eq(accounts.tenantId, tenantId),
                or(like(accounts.name, '%مبيعات%'), like(accounts.name, '%Sales%'), like(accounts.name, '%Revenue%'))
            )
        });
        if (!salesAccount) {
            const [newSales] = await db.insert(accounts).values({
                tenantId,
                name: "إيرادات المبيعات (تلقائي)",
                code: `401-${Date.now().toString().slice(-4)}`,
                type: 'revenue',
                currency: 'EGP',
                balance: '0'
            }).returning();
            salesAccount = newSales;
        }

        // Find OR Create Cash Account
        let cashAccount = await db.query.accounts.findFirst({
            where: (accounts, { like, and, eq }) => and(eq(accounts.tenantId, tenantId), like(accounts.name, '%نقدية%'))
        });
        if (!cashAccount) {
            const [newCash] = await db.insert(accounts).values({
                tenantId,
                name: "النقدية (تلقائي)",
                code: `101-${Date.now().toString().slice(-4)}`,
                type: 'asset',
                currency: 'EGP',
                balance: '0'
            }).returning();
            cashAccount = newCash;
        }

        if (salesAccount && cashAccount) {
            const { createJournalEntry } = await import("@/features/accounting/actions");
            const baseSubtotal = subtotal * exchangeRate;
            const baseTaxTotal = taxTotal * exchangeRate;
            const baseTotal = totalAmount * exchangeRate;

            const lines = [
                // Debit Sales (Reduce Revenue)
                {
                    accountId: salesAccount.id,
                    debit: baseSubtotal,
                    credit: 0,
                    description: `مردودات مبيعات - فاتورة ${originalInvoice.invoiceNumber}`
                },
                // Debit Tax (Reduce Tax Liability)
                ...(baseTaxTotal > 0 ? [{
                    accountId: salesAccount.id, // Using Sales Account for Tax simplicity as per original setup
                    debit: baseTaxTotal,
                    credit: 0,
                    description: `ضريبة مردودات - فاتورة ${originalInvoice.invoiceNumber}`
                }] : []),
                // Credit Cash (Refund)
                {
                    accountId: cashAccount.id,
                    debit: 0,
                    credit: baseTotal,
                    description: `سداد قيمة مرتجع - فاتورة ${originalInvoice.invoiceNumber}`
                }
            ];

            const jeResult = await createJournalEntry({
                date: data.returnDate,
                reference: returnInvoice.invoiceNumber,
                description: `مرتجع مبيعات فاتورة ${originalInvoice.invoiceNumber}`,
                currency: originalInvoice.currency,
                exchangeRate: Number(originalInvoice.exchangeRate),
                lines: lines
            });

            if (!jeResult.success) {
                console.error("Journal Entry Failed for Return:", jeResult.message);
                // We return SUCCESS but with a warning because the invoice itself was created
                return {
                    success: true,
                    message: `تم إنشاء المرتجع، ولكن فشل القيد المحاسبي: ${jeResult.message}`,
                    id: returnInvoice.id
                };
            }
        } else {
            console.error("Critical: Could not find or create accounts for return invoice accounting.");
        }

        // Check if fully returned or partially
        // 1. Get all returns for this invoice (including the one we just created)
        const allReturns = await db.query.invoices.findMany({
            where: (inv, { eq, and }) => and(
                eq(inv.relatedInvoiceId, originalInvoice.id.toString()),
                eq(inv.type, 'return')
            )
        });

        // 2. Sum up totals (Absolute values because returns are negative)
        const totalReturnedAmount = allReturns.reduce((sum, ret) => sum + Math.abs(Number(ret.totalAmount)), 0);
        const originalTotal = Number(originalInvoice.totalAmount);

        // 3. Determine Status
        // Allow a tiny epsilon for float comparisons
        const isFullyReturned = Math.abs(totalReturnedAmount - originalTotal) < 0.1;

        const newStatus = isFullyReturned ? 'returned' : 'partially_returned';

        // Update Original Invoice Status
        await db.update(invoices)
            .set({ status: newStatus })
            .where(eq(invoices.id, originalInvoice.id));

        revalidatePath("/dashboard/sales");
        revalidatePath("/dashboard/reports/income-statement");

        return { success: true, message: dict.Common.Success, id: returnInvoice.id };

    } catch (e: any) {
        console.error("Return Invoice Error:", e);
        return { success: false, message: dict.Common.Error };
    }
}

export async function getInvoices(page: number = 1, pageSize: number = 100) {
    try {
        const tenantId = await requireTenant(); // Strict Tenant
        const limit = pageSize;
        const offset = (page - 1) * limit;

        const data = await db.query.invoices.findMany({
            where: (invoices, { eq, and }) => eq(invoices.tenantId, tenantId),
            orderBy: desc(invoices.createdAt), // Order by CreatedAt Timestamp DESC
            limit: limit + 1,
            offset: offset,
            with: {
                items: true
            }
        });

        const hasNextPage = data.length > limit;
        const paginatedInvoices = hasNextPage ? data.slice(0, limit) : data;

        return {
            invoices: paginatedInvoices,
            hasNextPage
        };
    } catch (e) {
        console.warn("Error fetching invoices or unauthorized", e);
        return { invoices: [], hasNextPage: false };
    }
}
