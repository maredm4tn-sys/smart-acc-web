"use server";

import { db } from "@/db";
import { products } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n-server";
import { categories } from "@/db/schema";

// Re-declaring for external usage compatibility if needed, though usually inferred from schema
// Re-declaring for external usage compatibility if needed, though usually inferred from schema
type CreateProductInput = {
    name: string;
    sku: string;
    barcode?: string;
    type: "goods" | "service";
    sellPrice: number;
    buyPrice: number;
    priceWholesale?: number;
    priceHalfWholesale?: number;
    priceSpecial?: number;
    stockQuantity: number;
    minStock?: number;
    location?: string;
    requiresToken?: boolean;
    categoryId?: number;
    unitId?: number;
    tenantId: string;
};

const createProductSchema = z.object({
    name: z.string().min(1),
    sku: z.string().min(1),
    barcode: z.string().optional(),
    type: z.enum(["goods", "service"]),
    sellPrice: z.number().nonnegative(),
    buyPrice: z.number().nonnegative(),
    priceWholesale: z.number().nonnegative().optional().default(0),
    priceHalfWholesale: z.number().nonnegative().optional().default(0),
    priceSpecial: z.number().nonnegative().optional().default(0),
    stockQuantity: z.number().int(),
    minStock: z.number().int().optional().default(0),
    location: z.string().optional(),
    requiresToken: z.boolean().optional().default(false),
    categoryId: z.number().int().optional(),
    unitId: z.number().int().optional(),
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

        // 1. Check SKU uniqueness - select ONLY id to be safe
        const existingList = await db.select({ id: products.id }).from(products)
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
            barcode: data.barcode,
            type: data.type,
            sellPrice: data.sellPrice.toString(),
            buyPrice: data.buyPrice.toString(),
            priceWholesale: data.priceWholesale.toString(),
            priceHalfWholesale: data.priceHalfWholesale.toString(),
            priceSpecial: data.priceSpecial.toString(),
            stockQuantity: data.stockQuantity.toString(),
            minStock: data.minStock,
            requiresToken: data.requiresToken,
            categoryId: data.categoryId,
            unitId: data.unitId,
            location: data.location,
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
                // requiresToken: data.requiresToken !== undefined ? data.requiresToken : undefined,
                // categoryId: data.categoryId,
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

        // 1. Get all existing SKUs for this tenant to avoid N+1 queries
        const existingProducts = await db.select({ sku: products.sku })
            .from(products)
            .where(eq(products.tenantId, tenantId));

        const existingSkus = new Set(existingProducts.map(p => p.sku));
        const toInsert = [];
        let skippedCount = 0;

        for (let i = 0; i < productsList.length; i++) {
            const p = productsList[i];
            const skuToUse = p.sku && p.sku.trim() !== ""
                ? p.sku
                : `PROD-${Date.now()}-${Math.floor(Math.random() * 10000)}-${i}`;

            if (existingSkus.has(skuToUse)) {
                skippedCount++;
                continue;
            }

            toInsert.push({
                tenantId: tenantId,
                name: p.name,
                sku: skuToUse,
                type: "goods" as const,
                sellPrice: p.sellPrice.toString(),
                buyPrice: p.buyPrice.toString(),
                stockQuantity: p.stockQuantity.toString(),
            });

            // Add to set to prevent duplicates within the same upload
            existingSkus.add(skuToUse);
        }

        if (toInsert.length > 0) {
            // Batch insert in chunks of 50 to avoid hitting placeholder limits
            const chunk = 50;
            for (let i = 0; i < toInsert.length; i += chunk) {
                await db.insert(products).values(toInsert.slice(i, i + chunk));
            }
        }

        revalidatePath("/dashboard/inventory");
        return {
            success: true,
            message: dict.Inventory.ImportDialog.ImportedCount.replace("{count}", toInsert.length.toString()),
            details: skippedCount > 0 ? `${skippedCount} skipped (exists).` : undefined
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

// --- Units Actions ---

import { units } from "@/db/schema";
import { sql } from "drizzle-orm"; // Ensure sql is imported if needed, usually available via db

export async function createUnit(name: string) {
    const { getSession } = await import("@/features/auth/actions");
    const session = await getSession();
    if (!session) return { success: false, message: "Unauthorized" };

    try {
        const { getActiveTenantId } = await import("@/lib/actions-utils");
        const tenantId = session.tenantId || await getActiveTenantId();

        const [newUnit] = await db.insert(units).values({
            tenantId,
            name,
        }).returning();

        return { success: true, unit: newUnit };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function getUnits() {
    const { getSession } = await import("@/features/auth/actions");
    const session = await getSession();
    if (!session) return [];

    try {
        const { getActiveTenantId } = await import("@/lib/actions-utils");
        const tenantId = session.tenantId || await getActiveTenantId();

        const data = await db.select().from(units).where(eq(units.tenantId, tenantId));
        return data;
    } catch (e) {
        return [];
    }
}
