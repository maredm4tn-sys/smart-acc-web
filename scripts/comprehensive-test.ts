
import { createInvoice } from "../src/features/sales/actions";
import { createCustomer } from "../src/features/customers/actions";
import { createProduct } from "../src/features/inventory/actions";
import { createAccount, createJournalEntry } from "../src/features/accounting/actions";
import { db } from "../src/db";
import { products, tenants, accounts, journalEntries } from "../src/db/schema";
import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env" });

async function main() {
    console.log("Starting Comprehensive Test...");
    const TEST_SUFFIX = Date.now().toString();

    // 0. Ensure Tenant
    console.log("--- 0. Tenant Setup ---");
    // We can rely on actions-utils implicitly, but let's just get a valid ID to pass to starts.
    // Actually, we want to test that sending "uuid" or garbage is handled OR we send a valid one.
    // The previous fixes in sales/customers actions handle "uuid" by resolving it.
    // We should test if inventory action handles it.

    // Let's first ensure we have a tenant ID we *know* exists to verify data later
    let tenantId = "";
    try {
        const { getActiveTenantId } = await import("../src/lib/actions-utils");
        tenantId = await getActiveTenantId();
        console.log("Resolved Active Tenant ID:", tenantId);
    } catch (e) {
        console.error("Failed to resolve tenant:", e);
        return;
    }

    // 1. Test Inventory (Create Product)
    console.log("\n--- 1. Testing Create Product ---");
    const sku = `TEST-PROD-${TEST_SUFFIX}`;
    const productRes = await createProduct({
        tenantId: "uuid", // Intentionally testing the "uuid" fallback/fix if it exists
        name: "Comprehensive Test Laptop",
        sku: sku,
        type: "goods",
        sellPrice: 5000,
        buyPrice: 4000,
        stockQuantity: 10
    });
    console.log("Product Creation Result:", productRes);

    if (!productRes.success) {
        console.error("!! Inventory Test Failed");
    } else {
        // Verify in DB
        const savedProduct = await db.query.products.findFirst({
            where: (p, { eq }) => eq(p.sku, sku)
        });
        if (savedProduct) {
            console.log("   verified saved product:", savedProduct.name, "Stock:", savedProduct.stockQuantity);
        } else {
            console.error("   !! Product saved but not found in DB?");
        }
    }


    // 2. Test Customer
    console.log("\n--- 2. Testing Create Customer ---");
    const customerRes = await createCustomer({
        tenantId: "uuid",
        name: `Test Customer ${TEST_SUFFIX}`,
        email: `test-${TEST_SUFFIX}@example.com`
    });
    console.log("Customer Creation Result:", customerRes);

    if (!customerRes.success) console.error("!! Customer Test Failed");

    // 3. Test Accounting (Create Accounts)
    console.log("\n--- 3. Testing Accounting Setup ---");
    // Ensure accounts exist for the invoice test
    // We won't test createAccount action extensively unless needed, but we need them for invoice journal
    // Let's try creating a special account to test the action
    const accountRes = await createAccount({
        tenantId: "uuid",
        code: `999-${TEST_SUFFIX.slice(-4)}`,
        name: `Test Account ${TEST_SUFFIX}`,
        type: "expense",
        parentId: null
    });
    console.log("Account Creation Result:", accountRes);


    // 4. Test Sales (Create Invoice)
    console.log("\n--- 4. Testing Create Invoice ---");
    // Need product ID
    const prod = await db.query.products.findFirst({ where: (p, { eq }) => eq(p.sku, sku) });
    if (!prod) {
        console.error("!! Cannot proceed with Invoice test: Product not found");
        return;
    }

    const invoiceRes = await createInvoice({
        tenantId: "uuid",
        customerName: `Test Customer ${TEST_SUFFIX}`,
        issueDate: "2025-01-02",
        currency: "EGP",
        exchangeRate: 1,
        includeTax: true,
        items: [
            {
                productId: prod.id,
                description: "Test Sale",
                quantity: 2,
                unitPrice: 6000 // Selling higher than list price
            }
        ]
    });
    console.log("Invoice Creation Result:", invoiceRes);

    if (invoiceRes.success) {
        // 5. Verification
        console.log("\n--- 5. Verifications ---");

        // A. Stock Update
        const updatedProd = await db.query.products.findFirst({ where: (p, { eq }) => eq(p.sku, sku) });
        console.log(`   Stock Check: Initial 10, Sold 2. Current: ${updatedProd?.stockQuantity}`);
        if (Number(updatedProd?.stockQuantity) === 8) {
            console.log("   [PASS] Stock updated correctly.");
        } else {
            console.error("   [FAIL] Stock not updated correctly.");
        }

        // B. Journal Entry
        // Find latest JE
        const je = await db.query.journalEntries.findFirst({
            orderBy: (je, { desc }) => [desc(je.createdAt)],
            with: {
                lines: true
            }
        });
        if (je) {
            console.log(`   Journal Entry Created: ${je.entryNumber} Total: ${je.lines.length} lines`);
            je.lines.forEach(l => console.log(`      Line: ${l.description} | Dr: ${l.debit} | Cr: ${l.credit}`));
            console.log("   [PASS] Journal Entry exists.");
        } else {
            console.error("   [FAIL] No journal entry found.");
        }
    } else {
        console.error("!! Invoice Creation Failed");
    }

    console.log("\nTest Complete.");
}

main().catch(console.error).then(() => process.exit(0));
