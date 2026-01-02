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
