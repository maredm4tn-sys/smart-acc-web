"use server";

import { db } from "@/db";
import { customers } from "@/db/schema";
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
        const result = await db.select().from(customers);
        return result;
    } catch (error) {
        return [];
    }
}
