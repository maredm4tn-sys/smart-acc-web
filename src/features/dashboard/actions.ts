"use server";

import { db } from "@/db";
import { invoices, accounts, products } from "@/db/schema";
import { count, sum } from "drizzle-orm";
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
        const [revenueRes, accRes, prodRes, invRes] = await Promise.all([
            db.select({ value: sum(invoices.totalAmount) }).from(invoices).then(res => res[0]),
            db.select({ value: count() }).from(accounts).then(res => res[0]),
            db.select({ value: count() }).from(products).then(res => res[0]),
            db.select({ value: count() }).from(invoices).then(res => res[0])
        ]);

        return {
            role: 'admin',
            data: {
                totalRevenue: revenueRes?.value || "0.00",
                totalAccounts: accRes?.value || 0,
                activeProducts: prodRes?.value || 0,
                invoicesCount: invRes?.value || 0
            }
        };
    } catch (e) {
        console.error("Dashboard stats error", e);
        return { role: 'admin', data: null, error: true };
    }
}
