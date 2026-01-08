
import { db } from "@/db";
import { journalEntries } from "@/db/schema";
import { desc } from "drizzle-orm";

async function check() {
    const entries = await db.select().from(journalEntries).orderBy(desc(journalEntries.id)).limit(5);
    console.log("Journal Entries Sample:");
    entries.forEach(e => {
        console.log({
            id: e.id,
            date: e.transactionDate,
            createdAt: e.createdAt,
            createdAtType: typeof e.createdAt
        });
    });
}

check();
