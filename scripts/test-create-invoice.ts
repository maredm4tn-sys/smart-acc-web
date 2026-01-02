
import { createInvoice } from "../src/features/sales/actions";
import { createCustomer } from "../src/features/customers/actions";
import { db } from "../src/db";
import { products, tenants, accounts } from "../src/db/schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function main() {
    console.log("Starting test...");

    // 1. Ensure Tenant
    let tenantId = "uuid";
    const existingTenant = await db.query.tenants.findFirst();
    if (existingTenant) {
        tenantId = existingTenant.id;
        console.log("Found tenant:", tenantId);
    } else {
        console.log("Creating tenant...");
        const [t] = await db.insert(tenants).values({ name: "Test Tenant" }).returning();
        tenantId = t.id;
    }

    // 2. Ensure Product
    let productId = 1;
    const existingProduct = await db.query.products.findFirst();
    if (existingProduct) {
        productId = existingProduct.id;
        console.log("Found product:", productId);
    } else {
        console.log("Creating product...");
        const [p] = await db.insert(products).values({
            tenantId,
            name: "Test Laptop",
            sku: "TEST-SKU-" + Date.now(),
            sellPrice: "1000",
            stockQuantity: "10"
        }).returning();
        productId = p.id;
    }

    // 3. Ensure Accounts (Cash & Sales) for Journal Entry
    console.log("Ensuring accounts...");
    const accs = await db.query.accounts.findMany({ where: (a, { eq }) => eq(a.tenantId, tenantId) });

    if (!accs.find(a => a.name.includes("نقدية"))) {
        await db.insert(accounts).values({
            tenantId, code: "101", name: "نقدية بالصندوق", type: "asset"
        });
    }
    if (!accs.find(a => a.name.includes("مبيعات"))) {
        await db.insert(accounts).values({
            tenantId, code: "401", name: "مبيعات", type: "revenue"
        });
    }


    // 4. Create Customer
    console.log("Creating customer...");
    const customerRes = await createCustomer({
        tenantId,
        name: "Test Customer " + Date.now(),
    });

    if (!customerRes.success) {
        console.error("Failed to create customer:", customerRes.message);
        return;
    }
    console.log("Customer created successfully.");

    // 5. Create Invoice
    console.log("Creating invoice...");
    const invoiceRes = await createInvoice({
        tenantId, // passing raw string, let action resolve it if needed, but here we have real ID
        customerName: "Test Customer",
        issueDate: "2025-01-01",
        currency: "EGP",
        exchangeRate: 1,
        includeTax: true,
        items: [
            {
                productId: productId,
                description: "Test Item",
                quantity: 1,
                unitPrice: 1000
            }
        ]
    });

    console.log("Invoice Result:", invoiceRes);

}

main().catch(console.error).then(() => process.exit(0));
