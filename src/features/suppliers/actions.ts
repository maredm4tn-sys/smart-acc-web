"use server";

import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { eq, desc, like, or, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/features/auth/actions";
import { redirect } from "next/navigation";

const supplierSchema = z.object({
    name: z.string().min(1, "اسم المورد مطلوب"),
    companyName: z.string().optional(),
    email: z.string().email("البريد غير صحيح").optional().or(z.literal("")),
    phone: z.string().optional(),
    address: z.string().optional(),
    taxId: z.string().optional(),
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
    const session = await getSession();
    if (!session?.tenantId) redirect('/login');

    const validation = supplierSchema.safeParse(data);
    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors };
    }

    try {
        await db.insert(suppliers).values({
            tenantId: session.tenantId,
            ...data
        });
        revalidatePath("/dashboard/suppliers");
        return { success: true };
    } catch (e: any) {
        console.error("DEBUG: createSupplier Failed", e);
        // Return more detailed error for debugging online
        return { error: `فشل الحفظ: ${e.message || "خطأ في قاعدة البيانات"}` };
    }
}

export async function updateSupplier(id: any, data: z.infer<typeof supplierSchema>) {
    const session = await getSession();
    if (!session?.tenantId) redirect('/login');

    const validation = supplierSchema.safeParse(data);
    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors };
    }

    try {
        await db.update(suppliers)
            .set(data)
            .where(and(eq(suppliers.id, Number(id)), eq(suppliers.tenantId, session.tenantId)));

        revalidatePath("/dashboard/suppliers");
        return { success: true };
    } catch (e: any) {
        console.error("DEBUG: updateSupplier Failed", e);
        return { error: `فشل التعديل: ${e.message || "خطأ غير معروف"}` };
    }
}

export async function deleteSupplier(id: number) {
    const session = await getSession();
    if (!session?.tenantId) redirect('/login');

    try {
        await db.delete(suppliers)
            .where(and(eq(suppliers.id, id), eq(suppliers.tenantId, session.tenantId)));
        revalidatePath("/dashboard/suppliers");
        return { success: true };
    } catch (e) {
        return { error: "Failed to delete supplier" };
    }
}
