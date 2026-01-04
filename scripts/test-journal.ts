
import { createJournalEntry, createAccount } from "../src/features/accounting/actions";
import { db } from "../src/db";
import { tenants } from "../src/db/schema";

async function test() {
    console.log("Testing Journal Entry Creation...");

    // Get Tenant
    const [tenant] = await db.select().from(tenants).limit(1);
    if (!tenant) {
        console.error("No tenant found!");
        process.exit(1);
    }
    console.log("Tenant:", tenant.id);

    // Create 2 Accounts to use
    // Ensure we have IDs.
    const acc1 = await createAccount({
        code: "9901",
        name: "Test Debit",
        type: "asset",
        parentId: null,
        tenantId: tenant.id
    });

    const acc2 = await createAccount({
        code: "9902",
        name: "Test Credit",
        type: "liability",
        parentId: null,
        tenantId: tenant.id
    });

    // We need IDs, and createAccount returns success/msg, not ID. 
    // We should probably fetch them.
    const acctDb1 = await db.query.accounts.findFirst({ where: (a, { eq }) => eq(a.code, "9901") });
    const acctDb2 = await db.query.accounts.findFirst({ where: (a, { eq }) => eq(a.code, "9902") });

    if (!acctDb1 || !acctDb2) {
        console.error("Failed to create test accounts");
        process.exit(1);
    }

    // Try Create Journal
    const result = await createJournalEntry({
        date: "2024-01-01",
        description: "Test Entry",
        lines: [
            { accountId: acctDb1.id, debit: 100, credit: 0 },
            { accountId: acctDb2.id, debit: 0, credit: 100 }
        ]
    });

    console.log("Result:", result);
}

test().catch(console.error);
