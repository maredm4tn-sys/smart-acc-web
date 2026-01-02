"use server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type UpdateSettingsInput = {
    tenantId: string;
    name: string;
    phone?: string;
    address?: string;
    taxId?: string;
    currency: string;
    // For logo, we might accept a URL string if uploaded elsewhere, 
    // or base64 string if small enough. For now, let's assume URL or empty.
    logoUrl?: string;
};

export async function updateSettings(data: UpdateSettingsInput) {
    try {
        const { getActiveTenantId } = await import("@/lib/actions-utils");
        const tenantId = await getActiveTenantId(data.tenantId);

        await db.update(tenants)
            .set({
                name: data.name,
                phone: data.phone,
                address: data.address,
                taxId: data.taxId,
                currency: data.currency,
                logoUrl: data.logoUrl,
                updatedAt: new Date(),
            })
            .where(eq(tenants.id, tenantId));

        try {
            revalidatePath("/dashboard/settings");
            // Also invoices might change appearance
            revalidatePath("/dashboard/sales");
        } catch (e) { }

        return { success: true, message: "تم حفظ الإعدادات بنجاح" };
    } catch (error) {
        console.error("Error updating settings:", error);
        return { success: false, message: "فشل في حفظ التغييرات" };
    }
}

export async function getSettings(tenantIdInput?: string) {
    try {
        const { getActiveTenantId } = await import("@/lib/actions-utils");
        const tenantId = await getActiveTenantId(tenantIdInput);

        const tenant = await db.query.tenants.findFirst({
            where: (t, { eq }) => eq(t.id, tenantId)
        });

        return tenant;
    } catch (e) {
        console.error(e);
        return null;
    }
}
