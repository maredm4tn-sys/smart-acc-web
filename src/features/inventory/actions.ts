"use server";

import { db } from "@/db";
import { products } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n-server";
import { categories } from "@/db/schema";

// Re-declaring for external usage compatibility if needed, though usually inferred from schema
type CreateProductInput = {
    name: string;
    sku: string;
    type: "goods" | "service";
    sellPrice: number;
    buyPrice: number;
    stockQuantity: number;
    requiresToken?: boolean;
    categoryId?: number;
    tenantId: string;
};

const createProductSchema = z.object({
    name: z.string().min(1),
    sku: z.string().min(1),
    type: z.enum(["goods", "service"]),
    sellPrice: z.number().nonnegative(),
    buyPrice: z.number().nonnegative(),
    stockQuantity: z.number().int(),
    requiresToken: z.boolean().optional().default(false),
    categoryId: z.number().int().optional(),
    tenantId: z.string().optional()
});

export async function createProduct(inputData: CreateProductInput) {
    const dict = await getDictionary();
    const { getSession } = await import("@/features/auth/actions");
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'SUPER_ADMIN')) {
        return { success: false, message: "Unauthorized: Admins only" };
    }

    const validation = createProductSchema.safeParse(inputData);
    if (!validation.success) {
        return { success: false, message: dict.Common.Error, errors: validation.error.flatten() };
    }
    const data = validation.data;

    try {
        const { getActiveTenantId } = await import("@/lib/actions-utils");
        // FIX: Prefer session tenantId, fallback to provided or active utils
        const tenantId = session.tenantId || await getActiveTenantId(data.tenantId);

        // 1. Check SKU uniqueness
        const existingList = await db.select().from(products)
            .where(and(eq(products.sku, data.sku), eq(products.tenantId, tenantId)))
            .limit(1);

        if (existingList.length > 0) {
            return { success: false, message: dict.Dialogs.AddProduct.Errors.SKUExists, field: "sku" };
        }

        // 2. Insert
        await db.insert(products).values({
            tenantId: tenantId,
            name: data.name,
            sku: data.sku,
            type: data.type,
            sellPrice: data.sellPrice.toString(),
            buyPrice: data.buyPrice.toString(),
            stockQuantity: data.stockQuantity.toString(),
            requiresToken: data.requiresToken || false,
            categoryId: data.categoryId,
        });

        try {
            revalidatePath("/dashboard/inventory");
            revalidatePath("/dashboard/sales/create");
        } catch (error) { }

        return { success: true, message: dict.Dialogs.AddProduct.Success };
    } catch (error: any) {
        console.error("Error creating product:", error);
        return { success: false, message: `Error: ${error.message || dict.Dialogs.AddProduct.Error}` };
    }
}

type UpdateProductInput = {
    id: number;
    tenantId: string;
    name: string;
    sku: string;
    type: "goods" | "service";
    sellPrice: number;
    buyPrice: number;
    stockQuantity: number;
    requiresToken?: boolean;
    categoryId?: number;
};

export async function updateProduct(data: UpdateProductInput) {
    const dict = await getDictionary();
    const { getSession } = await import("@/features/auth/actions");
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'SUPER_ADMIN')) {
        return { success: false, message: "Unauthorized: Admins only" };
    }
    try {
        const { getActiveTenantId } = await import("@/lib/actions-utils");
        const tenantId = await getActiveTenantId(data.tenantId);
        const { eq, and } = await import("drizzle-orm");

        await db.update(products)
            .set({
                name: data.name,
                type: data.type,
                sellPrice: data.sellPrice.toString(),
                buyPrice: data.buyPrice.toString(),
                stockQuantity: data.stockQuantity.toString(),
                requiresToken: data.requiresToken !== undefined ? data.requiresToken : undefined,
                categoryId: data.categoryId,
            })
            .where(and(eq(products.id, data.id), eq(products.tenantId, tenantId)));

        try {
            revalidatePath("/dashboard/inventory");
            revalidatePath("/dashboard/sales/create");
        } catch (error) { }

        return { success: true, message: dict.Dialogs.EditProduct.Success };
    } catch (error) {
        console.error("Error updating product:", error);
        return { success: false, message: dict.Dialogs.EditProduct.Error };
    }

}

export async function bulkImportProducts(productsList: { name: string; sku?: string; sellPrice: number; buyPrice: number; stockQuantity: number; tenantId?: string }[]) {
    const dict = await getDictionary();
    try {
        const { getSession } = await import("@/features/auth/actions");
        const session = await getSession();
        if (!session || (session.role !== 'admin' && session.role !== 'SUPER_ADMIN')) {
            return { success: false, message: dict.Common.Error };
        }

        const tenantId = session.tenantId;
        if (!tenantId) {
            return { success: false, message: dict.Common.Error };
        }

        if (!productsList || productsList.length === 0) return { success: false, message: dict.Common.Error };

        let successCount = 0;
        let errors = [];

        for (let i = 0; i < productsList.length; i++) {
            const p = productsList[i];
            // Auto-generate SKU if missing or empty
            const skuToUse = p.sku && p.sku.trim() !== ""
                ? p.sku
                : `PROD-${Date.now()}-${Math.floor(Math.random() * 10000)}-${i}`;

            try {
                // Check if SKU exists
                const existing = await db.query.products.findFirst({
                    where: (prod, { and, eq }) => and(eq(prod.sku, skuToUse), eq(prod.tenantId, tenantId))
                });

                if (existing) {
                    errors.push(`Skipped ${skuToUse} (Exists)`);
                    continue;
                }

                await db.insert(products).values({
                    tenantId: tenantId,
                    name: p.name,
                    sku: skuToUse,
                    type: "goods",
                    sellPrice: p.sellPrice.toString(),
                    buyPrice: p.buyPrice.toString(),
                    stockQuantity: p.stockQuantity.toString(),
                });
                successCount++;
            } catch (err) {
                console.error(`Error importing ${skuToUse}:`, err);
                errors.push(`Error ${skuToUse}`);
            }
        }

        revalidatePath("/dashboard/inventory");
        return {
            success: true,
            message: dict.Inventory.ImportDialog.ImportedCount.replace("{count}", successCount.toString()),
            details: errors.length > 0 ? `${errors.length} skipped/failed.` : undefined
        };

    } catch (e) {
        console.error("Bulk Import Error:", e);
        const dict = await getDictionary();
        return { success: false, message: dict.Common.Error };
    }
}

export async function getInventoryExport() {
    const { getSession } = await import("@/features/auth/actions");
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'SUPER_ADMIN')) {
        return [];
    }

    try {
        const { getActiveTenantId } = await import("@/lib/actions-utils");
        const tenantId = session.tenantId || await getActiveTenantId();

        const data = await db.query.products.findMany({
            where: (products, { eq }) => eq(products.tenantId, tenantId),
            orderBy: (products, { asc }) => [asc(products.sku)],
        });

        return data.map(p => ({
            "كود الصنف (SKU)": p.sku,
            "اسم الصنف": p.name,
            "النوع": p.type === 'goods' ? 'مخزني' : 'خدمة',
            "سعر الشراء": Number(p.buyPrice),
            "سعر البيع": Number(p.sellPrice),
            "الرصيد الحالي": Number(p.stockQuantity),
        }));
    } catch (e) {
        console.error("Export Error", e);
        return [];
    }
}

// --- Category Actions ---

export async function createCategory(name: string) {
    const { getSession } = await import("@/features/auth/actions");
    const session = await getSession();
    if (!session) return { success: false, message: "Unauthorized" };

    try {
        const { getActiveTenantId } = await import("@/lib/actions-utils");
        const tenantId = session.tenantId || await getActiveTenantId();

        await db.insert(categories).values({
            tenantId,
            name,
        });

        revalidatePath("/dashboard/inventory");
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function getCategories() {
    const { getSession } = await import("@/features/auth/actions");
    const session = await getSession();
    if (!session) return [];

    try {
        const { getActiveTenantId } = await import("@/lib/actions-utils");
        const tenantId = session.tenantId || await getActiveTenantId();

        const data = await db.select().from(categories).where(eq(categories.tenantId, tenantId));
        return data;
    } catch (e) {
        return [];
    }
}
