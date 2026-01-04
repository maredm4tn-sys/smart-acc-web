"use server";

import { db } from "@/db";
import { invoices, accounts, products } from "@/db/schema";
import { count, sum, sql, eq } from "drizzle-orm";
import { getCashierStats } from "@/features/sales/stats";
import { getSession } from "@/features/auth/actions";

export async function getDashboardStats() {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const role = session.role;

    if (role === 'cashier') {
        const cashierStats = await getCashierStats(session.userId);
        return { role: 'cashier', data: cashierStats };
    }

    // Admin Stats
    try {
        const tenantId = session.tenantId;
        const [revenueRes, accRes, prodRes, invRes, recRes] = await Promise.all([
            db.select({ value: sum(invoices.totalAmount) }).from(invoices).where(eq(invoices.tenantId, tenantId)).then(res => res[0]),
            db.select({ value: count() }).from(accounts).where(eq(accounts.tenantId, tenantId)).then(res => res[0]),
            db.select({ value: count() }).from(products).where(eq(products.tenantId, tenantId)).then(res => res[0]),
            db.select({ value: count() }).from(invoices).where(eq(invoices.tenantId, tenantId)).then(res => res[0]),
            // Receivables: Sum(total - paid)
            db.select({ value: sql`SUM(${invoices.totalAmount} - COALESCE(${invoices.amountPaid}, 0))` })
                .from(invoices).where(eq(invoices.tenantId, tenantId)).then(res => res[0])
        ]);

        return {
            role: 'admin',
            data: {
                totalRevenue: revenueRes?.value || "0.00",
                totalAccounts: accRes?.value || 0,
                activeProducts: prodRes?.value || 0,
                invoicesCount: invRes?.value || 0,
                totalReceivables: recRes?.value || "0.00"
            }
        };
    } catch (e) {
        console.error("Dashboard stats error", e);
        return { role: 'admin', data: null, error: true };
    }
}

export async function getRevenueChartData() {
    const session = await getSession();
    const tenantId = session?.tenantId;
    if (!tenantId) return [];

    try {
        const rawData = await db.select({
            date: invoices.issueDate,
            amount: invoices.totalAmount
        })
            .from(invoices)
            .where(eq(invoices.tenantId, tenantId))
            .limit(100);

        // Simple aggregation by day name
        const daysMap: Record<string, number> = {};
        rawData.forEach(inv => {
            if (!inv.date) return;
            const dayName = new Date(inv.date).toLocaleDateString('en-US', { weekday: 'long' });
            daysMap[dayName] = (daysMap[dayName] || 0) + Number(inv.amount);
        });

        return Object.entries(daysMap).map(([name, value]) => ({ name, value }));
    } catch (e) {
        console.error("Chart data error", e);
        return [];
    }
}
