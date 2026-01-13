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
    defaultPrintSales: z.enum(['standard', 'thermal']).default('standard'),
    defaultPrintPOS: z.enum(['standard', 'thermal']).default('thermal'),
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
                defaultPrintSales: data.defaultPrintSales,
                defaultPrintPOS: data.defaultPrintPOS,
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

        let tenant = null;
        try {
            tenant = await db.query.tenants.findFirst({
                where: (t, { eq }) => eq(t.id, tenantId)
            });
        } catch (dbError) {
            console.error("Database schema mismatch, falling back to basic select:", dbError);
            // Fallback for missing columns: Just get name and basic info
            const result = await db.select({
                id: tenants.id,
                name: tenants.name
            }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
            if (result.length > 0) tenant = result[0];
        }

        return tenant || { name: "المحاسب الذكي", currency: "EGP" };
    } catch (e) {
        console.error(e);
        return null;
    }
}
