
import { updateProduct } from "../src/features/inventory/actions";
import { createProduct } from "../src/features/inventory/actions";
import { db } from "../src/db";
import { products } from "../src/db/schema";
import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env" });

async function main() {
    console.log("Testing Product Update & Fetch...");
    const SUFFIX = Date.now();

    // 1. Create
    const sku = `TEST-UPDATE-${SUFFIX}`;
    await createProduct({
        tenantId: "uuid",
        name: "Old Name",
        sku: sku,
        type: "goods",
        sellPrice: 100,
        buyPrice: 50,
        stockQuantity: 10
    });
    console.log(`Created product: ${sku} with name 'Old Name'`);

    // 2. Mock Fetch (like Create Page)
    let fetched = await db.select().from(products).where(eq(products.sku, sku));
    console.log("Fetch 1 Name:", fetched[0].name);

    // 3. Update
    const prodId = fetched[0].id;
    await updateProduct({
        id: prodId,
        tenantId: "uuid",
        name: "New Name Updated",
        sku: sku,
        type: "goods",
        sellPrice: 200,
        buyPrice: 50,
        stockQuantity: 10
    });
    console.log("Updated product to 'New Name Updated'");

    // 4. Mock Fetch Again
    fetched = await db.select().from(products).where(eq(products.sku, sku));
    console.log("Fetch 2 Name:", fetched[0].name);

    if (fetched[0].name === "New Name Updated") {
        console.log("SUCCESS: DB updated correctly.");
    } else {
        console.error("FAIL: DB did not update!");
    }
}

main().catch(console.error).then(() => process.exit(0));
