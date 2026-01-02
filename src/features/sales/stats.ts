"use server";

import { db } from "@/db";
import { invoices, invoiceItems } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export async function getCashierStats(userId: string) {
    try {
        // Fix: Use Egypt Time for 'Today' calculation
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });

        const result = await db.select({
            total: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
            count: sql<number>`COUNT(*)`
        })
            .from(invoices)
            .where(and(
                eq(invoices.createdBy, userId),
                eq(invoices.issueDate, today)
            ));

        const recentInvoices = await db.select().from(invoices)
            .where(eq(invoices.createdBy, userId))
            .orderBy(sql`${invoices.createdAt} DESC`)
            .limit(5);

        return {
            todayTotal: Number(result[0]?.total || 0),
            todayCount: Number(result[0]?.count || 0),
            recentInvoices
        };

    } catch (e) {
        console.error("Error fetching cashier stats (DB likely missing created_by):", e);
        return { todayTotal: 0, todayCount: 0, recentInvoices: [] };
    }
}
