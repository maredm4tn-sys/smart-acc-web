"use server";

import { db } from "@/db";
import { products } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n-server";

// Re-declaring for external usage compatibility if needed, though usually inferred from schema
type CreateProductInput = {
    name: string;
    sku: string;
    type: "goods" | "service";
    sellPrice: number;
    buyPrice: number;
    stockQuantity: number;
    tenantId: string;
};

const createProductSchema = z.object({
    name: z.string().min(1),
    sku: z.string().min(1),
    type: z.enum(["goods", "service"]),
    sellPrice: z.number().nonnegative(),
    buyPrice: z.number().nonnegative(),
    stockQuantity: z.number().int(),
    tenantId: z.string().optional()
});

export async function createProduct(inputData: CreateProductInput) {
    const dict = await getDictionary();
    const { getSession } = await import("@/features/auth/actions");
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return { success: false, message: "Unauthorized: Admins only" };
    }

    const validation = createProductSchema.safeParse(inputData);
    if (!validation.success) {
        return { success: false, message: "Invalid Data", errors: validation.error.flatten() };
    }
    const data = validation.data;

    try {
        const { getActiveTenantId } = await import("@/lib/actions-utils");
        const tenantId = await getActiveTenantId(data.tenantId);

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
        });

        try {
            revalidatePath("/dashboard/inventory");
            revalidatePath("/dashboard/sales/create");
        } catch (error) { }

        return { success: true, message: dict.Dialogs.AddProduct.Success };
    } catch (error) {
        console.error("Error creating product:", error);
        return { success: false, message: dict.Dialogs.AddProduct.Error };
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
};

export async function updateProduct(data: UpdateProductInput) {
    const dict = await getDictionary();
    const { getSession } = await import("@/features/auth/actions");
    const session = await getSession();
    if (!session || session.role !== 'admin') {
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

export async function bulkImportProducts(productsList: { name: string; sku: string; sellPrice: number; buyPrice: number; stockQuantity: number; tenantId?: string }[]) {
    try {
        const { getSession } = await import("@/features/auth/actions");
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return { success: false, message: "Unauthorized: Admins only" };
        }

        const { getActiveTenantId } = await import("@/lib/actions-utils");
        const tenantId = await getActiveTenantId(); // Default tenant

        if (!productsList || productsList.length === 0) return { success: false, message: "Empty list" };

        let successCount = 0;
        let errors = [];

        // Optimize: Batch insert or loop? 
        // For 2000 products, loop with try/catch per item is safer to allow partial success (skip duplicates), 
        // but batch is faster. 
        // "Transaction Safety" requirement suggests we might want all-or-nothing, OR robust report.
        // Usually, users prefer "Skip duplicates" for bulk import.

        // We will do a robust loop for now to provide detailed feedback.
        // Can be optimized to batch filtered list later.

        for (const p of productsList) {
            try {
                // Check if SKU exists
                const existing = await db.query.products.findFirst({
                    where: (prod, { and, eq }) => and(eq(prod.sku, p.sku), eq(prod.tenantId, tenantId))
                });

                if (existing) {
                    // Option: Update stock? Or Skip?
                    // User request: "Upload CSV to ADD products". 
                    // Let's Skip duplicates to avoid overwriting data accidentally.
                    errors.push(`Skipped ${p.sku} (Exists)`);
                    continue;
                }

                await db.insert(products).values({
                    tenantId: tenantId,
                    name: p.name,
                    sku: p.sku,
                    type: "goods",
                    sellPrice: p.sellPrice.toString(),
                    buyPrice: p.buyPrice.toString(),
                    stockQuantity: p.stockQuantity.toString(),
                });
                successCount++;
            } catch (err) {
                console.error(`Error importing ${p.sku}:`, err);
                errors.push(`Error ${p.sku}`);
            }
        }

        revalidatePath("/dashboard/inventory");
        return {
            success: true,
            message: `Imported ${successCount} products.`,
            details: errors.length > 0 ? `${errors.length} skipped/failed.` : undefined
        };

    } catch (e) {
        console.error("Bulk Import Error:", e);
        return { success: false, message: "Server Error during import" };
    }
}
