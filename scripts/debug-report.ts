
import { db } from "@/db";
import { journalEntries, journalLines, accounts } from "@/db/schema";
import { desc, eq, and, or, sql, gte, lte } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant-security";

// Mock requireTenant
const getActiveTenantId = async () => {
    // Just grab the first tenant
    const t = await db.query.tenants.findFirst();
    return t ? t.id : '';
}

async function check() {
    const tenantId = await getActiveTenantId();
    console.log("Tenant:", tenantId);

    const startDate = new Date('2025-01-01');
    const endDate = new Date('2026-12-31');

    const revenueDetails = await db
        .select({
            id: journalEntries.id,
            date: journalEntries.transactionDate,
            createdAt: journalEntries.createdAt,
            entryNumber: journalEntries.entryNumber,
            description: journalEntries.description,
        })
        .from(journalLines)
        .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .where(
            and(
                eq(journalEntries.tenantId, tenantId),
                or(
                    eq(accounts.type, 'revenue'),
                    eq(accounts.type, 'income'),
                    sql`${accounts.name} LIKE '%مبيعات%'`,
                    sql`${accounts.name} LIKE '%Sales%'`,
                    sql`${accounts.name} LIKE '%Revenue%'`
                ),
                gte(journalEntries.transactionDate, startDate.toISOString().split('T')[0])
            )
        )
        .orderBy(desc(journalEntries.transactionDate), desc(journalEntries.id))
        .limit(5);

    console.log("Revenue Sample:");
    revenueDetails.forEach(item => {
        console.log(item);
        console.log("createdAt Type:", typeof item.createdAt);
        if (item.createdAt) console.log("createdAt Year:", new Date(item.createdAt).getFullYear());
    });
}

check();
