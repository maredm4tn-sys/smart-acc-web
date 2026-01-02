"use server";

import { db } from "@/db";
import { products } from "@/db/schema";
import { revalidatePath } from "next/cache";

type CreateProductInput = {
    name: string;
    sku: string;
    type: "goods" | "service";
    sellPrice: number;
    buyPrice: number;
    stockQuantity: number;
    tenantId: string;
};

import { getDictionary } from "@/lib/i18n-server";

export async function createProduct(data: CreateProductInput) {
    console.log("createProduct called", data);
    const dict = await getDictionary();
    try {
        const { getActiveTenantId } = await import("@/lib/actions-utils");
        const tenantId = await getActiveTenantId(data.tenantId);
        console.log("Resolved Tenant:", tenantId);
        const { eq, and } = await import("drizzle-orm");

        // 1. Check SKU uniqueness
        // Use db.select() instead of db.query() to minimize RQB dependency issues
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
        } catch (error) {
            // Ignore revalidate error in test environment
        }
        return { success: true, message: dict.Dialogs.AddProduct.Success };
    } catch (error: any) {
        console.error("Error creating product:", error);
        // Return the actual error message if possible for debugging, or a generic one
        return { success: false, message: error.message || dict.Dialogs.AddProduct.Error };
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
