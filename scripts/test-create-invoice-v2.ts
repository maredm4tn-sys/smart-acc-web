
import { createInvoice } from "../src/features/sales/actions";
import { db } from "../src/db";
import { products, tenants } from "../src/db/schema";
import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env" });

async function main() {
    console.log("Testing Create Invoice...");

    // 1. Get or Create Tenant
    let tenantId: string;
    const allTenants = await db.select().from(tenants).limit(1);
    if (allTenants.length === 0) {
        console.log("Creating test tenant...");
        const [newTenant] = await db.insert(tenants).values({
            name: "Test Tenant",
            currency: "EGP"
        }).returning();
        tenantId = newTenant.id;
    } else {
        tenantId = allTenants[0].id;
    }
    console.log("Using Tenant ID:", tenantId);

    // 2. Get or Create Product
    let productId: number;
    const allProducts = await db.select().from(products).where(eq(products.tenantId, tenantId)).limit(1);
    if (allProducts.length === 0) {
        console.log("Creating test product...");
        const [newProduct] = await db.insert(products).values({
            tenantId: tenantId,
            name: "Test Product",
            sku: "TEST-001",
            sellPrice: "100.00",
            buyPrice: "50.00",
            stockQuantity: "100"
        }).returning();
        productId = newProduct.id;
    } else {
        productId = allProducts[0].id;
    }
    console.log("Using Product ID:", productId);

    const result = await createInvoice({
        customerName: "Test Client",
        issueDate: "2024-01-01",
        currency: "EGP",
        exchangeRate: 1,
        includeTax: true,
        items: [
            {
                productId: productId,
                description: "Test Item",
                quantity: 1,
                unitPrice: 100
            }
        ],
        tenantId: tenantId
    });

    console.log("Result:", result);
}

main().catch(e => {
    console.error("CRITICAL ERROR:", e);
}).then(() => process.exit(0));
