
import { db } from "../src/db";
import { tenants, products, customers } from "../src/db/schema";
import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { PGlite } from "@electric-sql/pglite";
import path from "path";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../src/db/schema";

dotenv.config({ path: ".env" });

async function seed() {
    console.log("Seeding database...");

    // Manual connection to ensure we use the same path logic
    const dbPath = process.env.PGLITE_DATA_DIR || 'postgres-data';
    console.log("Using DB Path:", dbPath);

    // 1. Create Tenant
    let tenantId;
    const allTenants = await db.select().from(tenants).limit(1);
    if (allTenants.length === 0) {
        console.log("Creating default tenant...");
        const [newTenant] = await db.insert(tenants).values({
            name: "الشركة الافتراضية",
            currency: "EGP",
            subscriptionPlan: "free"
        }).returning();
        tenantId = newTenant.id;
    } else {
        tenantId = allTenants[0].id;
        console.log("Tenant already exists:", tenantId);
    }

    // 2. Create Product
    const allProducts = await db.select().from(products).where(eq(products.tenantId, tenantId)).limit(1);
    if (allProducts.length === 0) {
        console.log("Creating default product...");
        await db.insert(products).values({
            tenantId: tenantId,
            name: "منتج تجريبي",
            sku: "DEMO-001",
            sellPrice: "150.00",
            buyPrice: "100.00",
            stockQuantity: "50",
            type: "goods"
        });
    }

    // 3. Create Customer
    const allCustomers = await db.select().from(customers).where(eq(customers.tenantId, tenantId)).limit(1);
    if (allCustomers.length === 0) {
        console.log("Creating default customer...");
        await db.insert(customers).values({
            tenantId: tenantId,
            name: "عميل افتراضي",
            phone: "01000000000"
        });
    }

    // 4. Create Default Accounts (Chart of Accounts)
    // We need 'Cash' (نقدية) and 'Sales' (مبيعات) for the invoice action to create Journal Entries.
    const { accounts } = await import("../src/db/schema");

    // Check for Cash Account
    const cashAccount = await db.query.accounts.findFirst({
        where: (accounts, { like, eq, and }) => and(
            eq(accounts.tenantId, tenantId),
            like(accounts.name, '%نقدية%')
        )
    });

    if (!cashAccount) {
        console.log("Creating default Cash account...");
        await db.insert(accounts).values({
            tenantId: tenantId,
            code: "10101",
            name: "الخزينة (نقدية)",
            type: "asset",
            balance: "10000.00"
        });
    }

    // Check for Sales Account
    const salesAccount = await db.query.accounts.findFirst({
        where: (accounts, { like, eq, and }) => and(
            eq(accounts.tenantId, tenantId),
            like(accounts.name, '%مبيعات%')
        )
    });

    if (!salesAccount) {
        console.log("Creating default Sales account...");
        await db.insert(accounts).values({
            tenantId: tenantId,
            code: "40101",
            name: "ايرادات المبيعات",
            type: "revenue",
            balance: "0.00"
        });
    }

    console.log("Seeding complete!");
}

seed().catch(console.error).then(() => process.exit(0));
