
import { db } from "../src/db";
import * as schema from "../src/db/schema";
import { factoryReset } from "../src/features/settings/actions/reset";
import { sql } from "drizzle-orm";

async function runTest() {
    console.log("🚀 Starting Factory Reset Test...");

    try {
        // 1. Add Fake Data
        console.log("📝 Seeding fake data...");

        // Tenant
        const tenantId = "test-tenant-reset";
        await db.insert(schema.tenants).values({
            id: tenantId,
            name: "Test Tenant",
            currency: "EGP"
        }).onConflictDoNothing();

        // Customer
        const [customer] = await db.insert(schema.customers).values({
            tenantId,
            name: "Delete Me Customer",
            phone: "0100000000"
        }).returning();

        // Product
        const [product] = await db.insert(schema.products).values({
            tenantId,
            name: "Delete Me Product",
            sku: "DEL-001",
            sellPrice: "100",
            buyPrice: "50",
            stockQuantity: "10"
        }).returning();

        // Invoice
        await db.insert(schema.invoices).values({
            tenantId,
            invoiceNumber: "INV-DEL-001",
            customerId: customer.id,
            customerName: customer.name,
            issueDate: new Date().toISOString(),
            subtotal: "100",
            totalAmount: "100",
            status: "posted"
        });

        console.log("✅ Fake data seeded.");

        // 2. Run Reset
        console.log("🔄 Executing factoryReset()...");
        const result = await factoryReset();
        console.log("Reset Result:", result);

        if (!result.success) {
            console.error("❌ Reset failed:", result.error);
            process.exit(1);
        }

        // 3. Verify Deletion
        console.log("🕵️ Verifying data...");

        const customersCount = await db.select({ count: sql<number>`count(*)` }).from(schema.customers);
        const productsCount = await db.select({ count: sql<number>`count(*)` }).from(schema.products);
        const invoicesCount = await db.select({ count: sql<number>`count(*)` }).from(schema.invoices);

        console.log("Stats after reset:");
        console.log("- Customers:", customersCount[0].count);
        console.log("- Products:", productsCount[0].count);
        console.log("- Invoices:", invoicesCount[0].count);

        if (customersCount[0].count === 0 && productsCount[0].count === 0 && invoicesCount[0].count === 0) {
            console.log("🎉 TEST PASSED: All data wiped successfully!");
        } else {
            console.error("❌ TEST FAILED: Some data remains.");
        }

    } catch (error) {
        console.error("❌ Unexpected Error:", error);
    }
}

runTest();
