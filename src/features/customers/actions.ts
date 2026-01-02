"use server";

import { db } from "@/db";
import { customers, invoices } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n-server";

const createCustomerSchema = z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    address: z.string().optional(),
    taxId: z.string().optional(),
    tenantId: z.string().optional()
});

type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export async function createCustomer(inputData: CreateCustomerInput) {
    const dict = await getDictionary();

    const validation = createCustomerSchema.safeParse(inputData);
    if (!validation.success) {
        return { success: false, message: "Invalid Data" };
    }
    const data = validation.data;

    try {
        const { getActiveTenantId } = await import("@/lib/actions-utils");
        const tenantId = await getActiveTenantId(data.tenantId);

        await db.insert(customers).values({
            name: data.name,
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
        const tenantId = await getActiveTenantId();

        // Calculate Debt: Sum of (Total - Paid) for all 'unpaid'/'partial' invoices
        // We can do this via raw SQL or robust logic. 
        // For type safety with Drizzle, let's fetch customers and their invoices or use a raw query if relation heavily nested.
        // Simplest V2 approach:

        const rows = await db.select({
            id: customers.id,
            name: customers.name,
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
