"use server";

import { db } from "@/db";
import { customers, invoices } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n-server";
import { getSession } from "@/features/auth/actions"; // Import getSession

const createCustomerSchema = z.object({
    name: z.string().min(1),
    companyName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(), // Relaxed validation
    address: z.string().optional(),
    taxId: z.string().optional(),
    nationalId: z.string().optional(),
    creditLimit: z.coerce.number().optional().default(0),
    paymentDay: z.coerce.number().min(1).max(31).optional(),
    tenantId: z.string().optional(),
    openingBalance: z.coerce.number().optional().default(0),
    priceLevel: z.enum(['retail', 'wholesale', 'half_wholesale', 'special']).default('retail'),
    representativeId: z.coerce.number().optional().nullable() // Added
});

type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export async function deleteCustomer(id: number) {
    const dict = await getDictionary();
    const session = await getSession();
    const tenantId = session?.tenantId;
    if (!tenantId) return { success: false, message: dict.Common.Error };

    try {
        const customer = await db.query.customers.findFirst({
            where: and(eq(customers.id, id), eq(customers.tenantId, tenantId))
        });

        if (!customer) return { success: false, message: dict.Common.Error };

        const existing = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.customerName, customer.name)).limit(1);
        if (existing.length > 0) {
            return { success: false, message: dict.Common?.Error || "Cannot delete customer with existing invoices" };
        }

        await db.delete(customers).where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
        revalidatePath("/dashboard/customers");
        return { success: true, message: dict.Common.Success };
    } catch (e) {
        return { success: false, message: dict.Common.Error };
    }
}

export async function updateCustomer(id: number, data: Partial<CreateCustomerInput>) {
    const dict = await getDictionary();
    const session = await getSession();
    const tenantId = session?.tenantId;
    if (!tenantId) return { success: false, message: dict.Common.Error };

    try {
        await db.update(customers).set(data).where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
        revalidatePath("/dashboard/customers");
        return { success: true, message: dict.Common.Success };
    } catch (e) {
        return { success: false, message: dict.Common.Error };
    }
}

export async function createCustomer(inputData: CreateCustomerInput) {
    console.log("🚀 [Server Action] createCustomer called with:", inputData);
    const dict = await getDictionary();

    const validation = createCustomerSchema.safeParse(inputData);
    if (!validation.success) {
        return { success: false, message: "Invalid Data", errors: validation.error.flatten() };
    }
    const data = validation.data;

    try {
        const { getSession } = await import("@/features/auth/actions");
        const session = await getSession();
        // STRICT SECURITY: Use session tenant only
        const tenantId = session?.tenantId;

        if (!tenantId) {
            return { success: false, message: "Unauthorized: No tenant found." };
        }

        await db.insert(customers).values({
            name: data.name,
            companyName: data.companyName,
            phone: data.phone,
            email: data.email,
            address: data.address,
            taxId: data.taxId,
            nationalId: data.nationalId,
            creditLimit: data.creditLimit,
            paymentDay: data.paymentDay,
            openingBalance: data.openingBalance,
            priceLevel: data.priceLevel,
            representativeId: data.representativeId, // Added
            tenantId: tenantId
        });

        revalidatePath("/dashboard/customers");
        return { success: true, message: dict.Dialogs.AddCustomer.Success };
    } catch (error: any) {
        const mode = process.env.NEXT_PUBLIC_APP_MODE;
        const dbInfo = process.env.DATABASE_URL ? "HasPG" : "NoPG";
        console.error("CRITICAL ERROR in createCustomer:", error);
        return { success: false, message: `${dict.Dialogs.AddCustomer.Error} (${error.message || "Unknown"}) [Mode:${mode}, DB:${dbInfo}]` };
    }
}

export async function getCustomers() {
    try {
        const { getActiveTenantId } = await import("@/lib/actions-utils");
        const session = await getSession();
        // FIX: Prioritize session tenant
        const tenantId = session?.tenantId || await getActiveTenantId();

        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

        const rows = await db.select({
            id: customers.id,
            name: customers.name,
            companyName: customers.companyName,
            phone: customers.phone,
            email: customers.email,
            address: customers.address,
            taxId: customers.taxId,
            nationalId: customers.nationalId,
            creditLimit: customers.creditLimit,
            paymentDay: customers.paymentDay,
            openingBalance: customers.openingBalance,
            priceLevel: customers.priceLevel,
            representativeId: customers.representativeId,
            totalDebt: sql<number>`COALESCE(${castNum(customers.openingBalance)}, 0) + COALESCE(SUM(${castNum(invoices.totalAmount)} - COALESCE(${castNum(invoices.amountPaid)}, 0)), 0)`
        })
            .from(customers)
            .leftJoin(invoices, eq(customers.name, invoices.customerName))
            .where(eq(customers.tenantId, tenantId))
            .groupBy(
                customers.id,
                customers.name,
                customers.companyName,
                customers.phone,
                customers.email,
                customers.address,
                customers.taxId,
                customers.nationalId,
                customers.creditLimit,
                customers.paymentDay,
                customers.openingBalance,
                customers.priceLevel,
                customers.representativeId
            );

        // Ultimate Sanitization: Convert to plain JSON to avoid any Serialization errors on Vercel
        const sanitized = rows.map(r => ({
            ...r,
            totalDebt: Number(r.totalDebt || 0),
            openingBalance: Number(r.openingBalance || 0),
            creditLimit: Number(r.creditLimit || 0),
            paymentDay: r.paymentDay ? Number(r.paymentDay) : null,
            representativeId: r.representativeId ? Number(r.representativeId) : null
        }));

        return JSON.parse(JSON.stringify(sanitized));
    } catch (error) {
        console.error("Get Customers Error:", error);
        return [];
    }
}

export async function getCustomerStatement(id: number, dateRange?: { from: Date, to: Date }) {
    const session = await getSession();
    if (!session?.tenantId) return null;
    const { tenantId } = session;

    try {
        const customer = await db.query.customers.findFirst({
            where: and(eq(customers.id, id), eq(customers.tenantId, tenantId))
        });

        if (!customer) return null;

        // Fetch Invoices (Debit to Customer)
        // Sales Invoice -> Customer owes money -> Debit
        const invoicesData = await db.select().from(invoices)
            .where(and(
                eq(invoices.customerName, customer.name), // ideally link by ID
                eq(invoices.tenantId, tenantId)
            ));

        // Fetch Receipts (Credit to Customer)
        // Customer pays -> Credit
        const { vouchers } = await import("@/db/schema");
        const receiptsData = await db.select().from(vouchers)
            .where(and(
                eq(vouchers.partyType, 'customer'),
                eq(vouchers.partyId, id),
                eq(vouchers.tenantId, tenantId)
            ));

        let transactions = [
            ...invoicesData.map(inv => ({
                id: `INV-${inv.id}`,
                date: new Date(inv.issueDate),
                type: 'INVOICE',
                ref: inv.invoiceNumber,
                description: `Sales Invoice #${inv.invoiceNumber}`,
                debit: Number(inv.totalAmount),
                credit: 0
            })),
            ...receiptsData.map(pay => ({
                id: `VCH-${pay.id}`,
                date: new Date(pay.date),
                type: pay.type === 'receipt' ? 'RECEIPT' : 'PAYMENT', // Receipt = money in
                ref: pay.voucherNumber,
                description: pay.description || 'Receipt',
                debit: pay.type === 'payment' ? Number(pay.amount) : 0, // Refund?
                credit: pay.type === 'receipt' ? Number(pay.amount) : 0 // Normal payment from customer
            }))
        ];

        // Sort
        transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Calculate balances
        let balance = Number(customer.openingBalance) || 0;
        let totalDebit = 0;
        let totalCredit = 0;

        // Opening Balance: Positive = Debit (He owes us), Negative = Credit (We owe him/Prepaid)

        const statement = transactions.map(t => {
            // Debit increases balance (he owes more), Credit decreases it (he paid)
            balance += (t.debit - t.credit);
            totalDebit += t.debit;
            totalCredit += t.credit;
            return { ...t, balance };
        });

        return {
            customer,
            openingBalance: Number(customer.openingBalance) || 0,
            transactions: statement,
            summary: {
                totalDebit,
                totalCredit,
                netBalance: balance
            }
        };

    } catch (e) {
        console.error("getCustomerStatement Error", e);
        return null;
    }
}

export async function getCustomersExport() {
    const { getSession } = await import("@/features/auth/actions");
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'SUPER_ADMIN')) {
        return [];
    }

    try {
        const tenantId = session.tenantId;
        if (!tenantId) return [];

        const data = await db.query.customers.findMany({
            where: (c, { eq }) => eq(c.tenantId, tenantId),
            orderBy: (c, { asc }) => [asc(c.name)],
        });

        return data.map(c => ({
            "الاسم": c.name,
            "الشركة": c.companyName || "-",
            "الهاتف": c.phone || "-",
            "البريد الإلكتروني": c.email || "-",
            "الرقم الضريبي": c.taxId || "-",
            "العنوان": c.address || "-"
        }));
    } catch (e) {
        console.error("Export Error", e);
        return [];
    }
}
