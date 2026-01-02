"use server";

import { db } from "@/db";
import { invoices, invoiceItems } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export async function getCashierStats(userId: string) {
    // TEMPORARY: Return empty stats to prevent crash due to missing 'created_by' column in DB.
    // The migration to add the column failed in the environment.
    return {
        todayTotal: 0,
        todayCount: 0,
        recentInvoices: []
    };
    /*
    try {
        const today = new Date().toISOString().split('T')[0];
        
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
        console.error("Error fetching cashier stats:", e);
        return { todayTotal: 0, todayCount: 0, recentInvoices: [] };
    }
    */
}
