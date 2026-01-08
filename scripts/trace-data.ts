
import { db } from "@/db";
import { journalEntries, journalLines, accounts } from "@/db/schema";
import { desc, eq, and, or, sql, gte, lte } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant-security";
import fs from 'fs';

// Mock requireTenant
const getActiveTenantId = async () => {
    // Just grab the first tenant
    // Check if db is capable of finding
    try {
        const t = await db.query.tenants.findFirst();
        return t ? t.id : '';
    } catch {
        return ''; // Fallback for offline db potentially
    }
}

async function trace() {
    console.log("Starting Trace...");
    try {
        const tenantId = await getActiveTenantId();
        console.log("Tenant:", tenantId);

        // Broad search
        const result = await db.select({
            id: journalEntries.id,
            entryNumber: journalEntries.entryNumber,
            date: journalEntries.transactionDate,
            createdAt: journalEntries.createdAt,
            description: journalEntries.description,
        })
            .from(journalEntries)
            .orderBy(desc(journalEntries.id))
            .limit(10);

        console.log("Found", result.length, "entries");
        fs.writeFileSync('trace.json', JSON.stringify(result, null, 2));
        console.log("Wrote trace.json");
    } catch (e) {
        console.error("Trace failed", e);
    }
}

trace();
