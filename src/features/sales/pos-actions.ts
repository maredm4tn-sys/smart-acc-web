"use server";

import { db } from "@/db";
import { invoices } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { getSession } from "@/features/auth/actions";
import { getActiveTenantId } from "@/lib/actions-utils";

export async function getShiftReport() {
    const session = await getSession();
    const tenantId = session?.tenantId || await getActiveTenantId();
    const userId = session?.userId;

    if (!tenantId || !userId) return null;

    const today = new Date().toISOString().split('T')[0];

    const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
    const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

    try {
        const results = await db.select({
            totalAmount: sql<number>`sum(${castNum(invoices.totalAmount)})`,
            discountAmount: sql<number>`sum(${castNum(invoices.discountAmount)})`,
            count: sql<number>`count(*)`,
            cashTotal: sql<number>`sum(case when ${invoices.paymentMethod} = 'cash' then ${castNum(invoices.totalAmount)} else 0 end)`,
            cardTotal: sql<number>`sum(case when ${invoices.paymentMethod} = 'card' then ${castNum(invoices.totalAmount)} else 0 end)`,
            otherTotal: sql<number>`sum(case when ${invoices.paymentMethod} NOT IN ('cash' , 'card') then ${castNum(invoices.totalAmount)} else 0 end)`,
        })
            .from(invoices)
            .where(
                and(
                    eq(invoices.tenantId, tenantId),
                    eq(invoices.createdBy, userId),
                    eq(invoices.issueDate, today)
                )
            );

        return {
            success: true,
            data: results[0] || { totalAmount: 0, discountAmount: 0, count: 0, cashTotal: 0, cardTotal: 0, otherTotal: 0 }
        };
    } catch (e) {
        console.error("Shift Report Error:", e);
        return { success: false, message: "Error generating report" };
    }
}
