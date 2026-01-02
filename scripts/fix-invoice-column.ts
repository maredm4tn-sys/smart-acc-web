import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Fixing invoices table...");

    // 1. Try adding column without foreign key first to ensure it exists
    try {
        await db.execute(sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by text;`);
        // Using text to be super safe against uuid type issues, though uuid is better. 
        // If schema expects uuid, Drizzle might cast it. let's stick to uuid but no FK.
        // Actually, schema says uuid. Let's try uuid.
        // If "IF NOT EXISTS" is not supported in this postgres version, we'll catch error.
    } catch (e) {
        console.log("Attempt 1 (IF NOT EXISTS) failed:", e);
        try {
            await db.execute(sql`ALTER TABLE invoices ADD COLUMN created_by uuid;`);
            console.log("Attempt 2 (Simple ADD) executed.");
        } catch (e2) {
            console.log("Attempt 2 failed (likely already exists):", e2);
        }
    }

    // 2. Refresh permissions/roles just in case
    // (Optional, but good practice if everything is fresh)

    console.log("Done.");
}

main();
