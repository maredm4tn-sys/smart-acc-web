
import { createProduct } from "../src/features/inventory/actions";
import { db } from "../src/db";
import { tenants } from "../src/db/schema";

async function test() {
    console.log("Testing Create Product...");

    // Get Tenant
    const [tenant] = await db.select().from(tenants).limit(1);
    console.log("Tenant:", tenant?.id);

    const result = await createProduct({
        name: "Test Prd " + Date.now(),
        sku: "TEST-" + Date.now(),
        type: "goods",
        sellPrice: 100,
        buyPrice: 80,
        stockQuantity: 10,
        tenantId: "" // Test auto-resolution
    });

    console.log("Result:", result);
}

test().catch(console.error);
