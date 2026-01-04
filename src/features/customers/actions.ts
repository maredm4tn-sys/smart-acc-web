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
    tenantId: z.string().optional()
});

type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export async function deleteCustomer(id: number) {
    const session = await getSession();
    const tenantId = session?.tenantId;
    if (!tenantId) return { success: false, message: "Unauthorized" };

    try {
        await db.delete(customers).where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
        revalidatePath("/dashboard/customers");
        return { success: true, message: "Deleted" };
    } catch (e) {
        return { success: false, message: "Error deleting" };
    }
}

export async function updateCustomer(id: number, data: Partial<CreateCustomerInput>) {
    const session = await getSession();
    const tenantId = session?.tenantId;
    if (!tenantId) return { success: false, message: "Unauthorized" };

    try {
        await db.update(customers).set(data).where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
        revalidatePath("/dashboard/customers");
        return { success: true, message: "Updated" };
    } catch (e) {
        return { success: false, message: "Error updating" };
    }
}

export async function createCustomer(inputData: CreateCustomerInput) {
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
            tenantId: tenantId
        });

        revalidatePath("/dashboard/customers");
        return { success: true, message: dict.Dialogs.AddCustomer.Success };
    } catch (error) {
        console.error("Error creating customer:", error);
        return { success: false, message: dict.Dialogs.AddCustomer.Error };
    }
}

export async function getCustomers() {
    try {
        const { getActiveTenantId } = await import("@/lib/actions-utils");
        const session = await getSession();
        // FIX: Prioritize session tenant
        const tenantId = session?.tenantId || await getActiveTenantId();

        // Calculate Debt: Sum of (Total - Paid) for all 'unpaid'/'partial' invoices
        // We can do this via raw SQL or robust logic. 
        // For type safety with Drizzle, let's fetch customers and their invoices or use a raw query if relation heavily nested.
        // Simplest V2 approach:

        const rows = await db.select({
            id: customers.id,
            name: customers.name,
            companyName: customers.companyName,
            phone: customers.phone,
            email: customers.email,
            address: customers.address,
            taxId: customers.taxId,
            totalDebt: sql<number>`COALESCE(SUM(${invoices.totalAmount} - COALESCE(${invoices.amountPaid}, 0)), 0)`
        })
            .from(customers)
            .leftJoin(invoices, eq(customers.name, invoices.customerName)) // ideally join on ID, but schema uses name currently
            .where(eq(customers.tenantId, tenantId))
            .groupBy(customers.id);

        return rows.map(r => ({
            ...r,
            totalDebt: Number(r.totalDebt)
        }));
    } catch (error) {
        console.error("Get Customers Error:", error);
        return [];
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
