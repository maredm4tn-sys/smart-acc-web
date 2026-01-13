"use server";

import { db } from "@/db";
import { suppliers, purchaseInvoices } from "@/db/schema";
import { eq, desc, like, or, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/features/auth/actions";
import { redirect } from "next/navigation";

const supplierSchema = z.object({
    name: z.string().min(1),
    companyName: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    address: z.string().optional(),
    taxId: z.string().optional(),
    openingBalance: z.coerce.number().optional().default(0),
});

export async function getSuppliers(search?: string) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return [];

        let whereClause = eq(suppliers.tenantId, session.tenantId);

        if (search) {
            whereClause = and(
                whereClause,
                or(
                    like(suppliers.name, `%${search}%`),
                    like(suppliers.phone, `%${search}%`),
                    like(suppliers.companyName, `%${search}%`)
                )
            ) as any;
        }

        return await db.select().from(suppliers)
            .where(whereClause)
            .orderBy(desc(suppliers.createdAt));
    } catch (e) {
        console.error("DEBUG: getSuppliers Failed", e);
        return [];
    }
}

export async function createSupplier(data: z.infer<typeof supplierSchema>) {
    const { getDictionary } = await import("@/lib/i18n-server");
    const dict = await getDictionary();
    const session = await getSession();
    if (!session?.tenantId) redirect('/login');

    const validation = supplierSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: dict.Common.Error };
    }

    try {
        console.log("🚀 [Server Action] createSupplier called with:", data);
        await db.insert(suppliers).values({
            tenantId: session.tenantId,
            ...data
        });
        revalidatePath("/dashboard/suppliers");
        return { success: true, message: dict.Common.Success };
    } catch (error: any) {
        const mode = process.env.NEXT_PUBLIC_APP_MODE;
        const dbInfo = process.env.DATABASE_URL ? "HasPG" : "NoPG";
        console.error("CRITICAL ERROR in createSupplier:", error);
        return {
            success: false,
            message: `${dict.Common.Error} (${error.message || "Unknown"}) [Mode:${mode}, DB:${dbInfo}]`
        };
    }
}

export async function updateSupplier(id: any, data: z.infer<typeof supplierSchema>) {
    const { getDictionary } = await import("@/lib/i18n-server");
    const dict = await getDictionary();
    const session = await getSession();
    if (!session?.tenantId) redirect('/login');

    const validation = supplierSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: dict.Common.Error };
    }

    try {
        await db.update(suppliers)
            .set(data)
            .where(and(eq(suppliers.id, Number(id)), eq(suppliers.tenantId, session.tenantId)));

        revalidatePath("/dashboard/suppliers");
        return { success: true, message: dict.Common.Success };
    } catch (e: any) {
        console.error("DEBUG: updateSupplier Failed", e);
        return {
            success: false,
            message: dict.Common.Error
        };
    }
}

export async function deleteSupplier(id: number) {
    const { getDictionary } = await import("@/lib/i18n-server");
    const dict = await getDictionary();
    const session = await getSession();
    if (!session?.tenantId) redirect('/login');

    try {
        // Check for transactions
        const existing = await db.select({ id: purchaseInvoices.id }).from(purchaseInvoices).where(eq(purchaseInvoices.supplierId, id)).limit(1);
        if (existing.length > 0) {
            return { success: false, message: dict.Common?.Error || "Cannot delete supplier with existing invoices" };
        }

        await db.delete(suppliers)
            .where(and(eq(suppliers.id, id), eq(suppliers.tenantId, session.tenantId)));
        revalidatePath("/dashboard/suppliers");
        return { success: true, message: dict.Common.Success };
    } catch (e: any) {
        return { success: false, message: dict.Common.Error };
    }
}

export async function getSupplierStatement(id: number, dateRange?: { from: Date, to: Date }) {
    const session = await getSession();
    if (!session?.tenantId) return null;
    const { tenantId } = session;

    try {
        const supplier = await db.query.suppliers.findFirst({
            where: and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId))
        });

        if (!supplier) return null;

        // Fetch Invoices (Credit for the supplier, Debit for us)
        // Purchase Invoice -> We owe money -> Credit to Supplier Account
        const invoicesData = await db.select().from(purchaseInvoices)
            .where(and(
                eq(purchaseInvoices.supplierId, id),
                eq(purchaseInvoices.tenantId, tenantId)
            ));

        // Fetch Payments (Debit to Supplier Account)
        // We pay -> Debit Supplier
        const { vouchers } = await import("@/db/schema");
        const paymentsData = await db.select().from(vouchers)
            .where(and(
                eq(vouchers.partyType, 'supplier'),
                eq(vouchers.partyId, id),
                eq(vouchers.tenantId, tenantId)
            ));

        // Normalize to transactions
        // Running Balance calculation can be complex if not ordered.

        let transactions = [
            ...invoicesData.map(inv => ({
                id: `INV-${inv.id}`,
                date: new Date(inv.issueDate),
                type: 'INVOICE',
                ref: inv.invoiceNumber,
                description: `Purchase Invoice #${inv.invoiceNumber}`,
                debit: 0,
                credit: Number(inv.totalAmount)
            })),
            ...paymentsData.map(pay => ({
                id: `VCH-${pay.id}`,
                date: new Date(pay.date),
                type: pay.type === 'payment' ? 'PAYMENT' : 'RECEIPT', // 'payment' means we paid supplier -> Debit Supplier
                ref: pay.voucherNumber,
                description: pay.description || 'Payment',
                debit: pay.type === 'payment' ? Number(pay.amount) : 0,
                credit: pay.type === 'receipt' ? Number(pay.amount) : 0 // If supplier pays us (refund)?
            }))
        ];

        // Sort by date
        transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Calculate balances
        let balance = Number(supplier.openingBalance) || 0;
        let totalDebit = 0;
        let totalCredit = 0;

        // Add Opening Balance as first transaction if exists
        if (balance !== 0) {
            // Supplier Opening Balance is usually Credit (we owe them)
            // If negative, it's Debit.
            // Let's assume positive openingBalance means we owe them (Credit).
            // Actually, "Credit" increases liability. 
        }

        const statement = transactions.map(t => {
            balance += (t.credit - t.debit);
            totalDebit += t.debit;
            totalCredit += t.credit;
            return { ...t, balance };
        });

        return {
            supplier,
            openingBalance: Number(supplier.openingBalance) || 0,
            transactions: statement,
            summary: {
                totalDebit,
                totalCredit,
                netBalance: balance
            }
        };

    } catch (e) {
        console.error("getSupplierStatement Error", e);
        return null;
    }
}
