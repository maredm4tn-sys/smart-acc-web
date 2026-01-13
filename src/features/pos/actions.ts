"use server";

import { db } from "@/db";
import { invoices } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant-security";

export async function getDailySummary() {
    try {
        const tenantId = await requireTenant();
        const todayStr = new Date().toISOString().split('T')[0];

        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

        const stats = await db.select({
            totalSales: sql<number>`sum(${castNum(invoices.totalAmount)})`,
            invoiceCount: sql<number>`count(${invoices.id})`,
            cash: sql<number>`sum(case when ${invoices.paymentMethod} = 'cash' then ${castNum(invoices.totalAmount)} else 0 end)`,
            card: sql<number>`sum(case when ${invoices.paymentMethod} = 'card' then ${castNum(invoices.totalAmount)} else 0 end)`,
            credit: sql<number>`sum(case when ${invoices.paymentMethod} = 'credit' then ${castNum(invoices.totalAmount)} else 0 end)`,
        })
            .from(invoices)
            .where(and(
                eq(invoices.tenantId, tenantId),
                eq(invoices.issueDate, todayStr)
            ));

        const data = stats[0] || { totalSales: 0, invoiceCount: 0, cash: 0, card: 0, credit: 0 };
        return {
            success: true,
            data: {
                totalSales: Number(data.totalSales || 0),
                invoiceCount: Number(data.invoiceCount || 0),
                cash: Number(data.cash || 0),
                card: Number(data.card || 0),
                credit: Number(data.credit || 0),
            }
        };
    } catch (error) {
        console.error("Daily summary error:", error);
        return { success: false, message: "فشل تحميل الملخص" };
    }
}
