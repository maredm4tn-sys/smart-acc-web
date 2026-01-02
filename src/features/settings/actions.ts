"use server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateSettingsSchema = z.object({
    tenantId: z.string().optional(),
    name: z.string().min(1),
    phone: z.string().optional(),
    address: z.string().optional(),
    taxId: z.string().optional(),
    currency: z.string().min(1),
    logoUrl: z.string().optional(),
});

type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export async function updateSettings(inputData: UpdateSettingsInput) {
    const validation = updateSettingsSchema.safeParse(inputData);
    if (!validation.success) {
        return { success: false, message: "Invalid Settings Data" };
    }
    const data = validation.data;

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
