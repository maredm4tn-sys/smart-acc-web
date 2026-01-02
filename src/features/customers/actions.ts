"use server";

import { db } from "@/db";
import { customers } from "@/db/schema";
import { revalidatePath } from "next/cache";

type CreateCustomerInput = {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    taxId?: string;
    tenantId: string;
};

import { getDictionary } from "@/lib/i18n-server";

export async function createCustomer(data: CreateCustomerInput) {
    const dict = await getDictionary();
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

        try {
            revalidatePath("/dashboard/customers");
        } catch (error) {
            // Ignore revalidate error in test environment
        }
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
