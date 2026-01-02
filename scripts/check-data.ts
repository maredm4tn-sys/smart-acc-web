
import { db } from "../src/db";
import { tenants, products, customers, invoices } from "../src/db/schema";
import * as dotenv from "dotenv";
import { count } from "drizzle-orm";

dotenv.config({ path: ".env" });

async function check() {
    console.log("Checking database content...");

    const dbPath = process.env.PGLITE_DATA_DIR || 'postgres-data';
    console.log("Reading from DB Path:", dbPath);

    const [tenantCount] = await db.select({ count: count() }).from(tenants);
    const [productCount] = await db.select({ count: count() }).from(products);
    const [customerCount] = await db.select({ count: count() }).from(customers);
    const [invoiceCount] = await db.select({ count: count() }).from(invoices);

    console.log("--- Report ---");
    console.log(`Tenants: ${tenantCount.count}`);
    console.log(`Products: ${productCount.count}`);
    console.log(`Customers: ${customerCount.count}`);
    console.log(`Invoices: ${invoiceCount.count}`);
    console.log("--------------");
}

check().catch(console.error).then(() => process.exit(0));
