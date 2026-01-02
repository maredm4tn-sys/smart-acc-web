import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Adding created_by to invoices...");
    try {
        await db.execute(sql`ALTER TABLE invoices ADD COLUMN created_by uuid REFERENCES users(id);`);
        console.log("Column added.");
    } catch (e: any) {
        if (e.message?.includes('already exists')) {
            console.log("Column already exists.");
        } else {
            console.log("Error adding column (might be okay if already present):", e.message);
        }
    }
}
main();
