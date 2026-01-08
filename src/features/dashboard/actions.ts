"use server";

import { db } from "@/db";
import { invoices, accounts, products, purchaseInvoices, journalLines, journalEntries } from "@/db/schema";
import { count, sum, sql, eq, and, gt, desc, gte } from "drizzle-orm";
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

        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

        const [
            revenueRes,
            accRes,
            prodRes,
            invRes,
            recRes,
            lowStockItems,
            overdueInvoices,
            duePurchases
        ] = await Promise.all([
            db.select({ value: sql`SUM(${castNum(invoices.totalAmount)})` }).from(invoices).where(eq(invoices.tenantId, tenantId)).then(res => res[0]),
            db.select({ value: count() }).from(accounts).where(eq(accounts.tenantId, tenantId)).then(res => res[0]),
            db.select({ value: count() }).from(products).where(eq(products.tenantId, tenantId)).then(res => res[0]),
            db.select({ value: count() }).from(invoices).where(eq(invoices.tenantId, tenantId)).then(res => res[0]),
            db.select({ value: sql`SUM(${castNum(invoices.totalAmount)} - ${castNum(sql`COALESCE(${invoices.amountPaid}, 0)`)})` })
                .from(invoices).where(and(eq(invoices.tenantId, tenantId), eq(invoices.type, 'sale'))).then(res => res[0]),
            db.query.products.findMany({
                where: (p, { and, eq }) => and(
                    eq(p.tenantId, tenantId),
                    sql`${castNum(p.stockQuantity)} <= 10`
                ),
                limit: 5
            }),
            // Overdue Invoices (Customer Debts > 0)
            db.select({
                id: invoices.id,
                customer: invoices.customerName,
                amount: sql`${castNum(invoices.totalAmount)} - ${castNum(invoices.amountPaid)}`,
                date: invoices.issueDate
            }).from(invoices).where(
                and(
                    eq(invoices.tenantId, tenantId),
                    eq(invoices.type, 'sale'),
                    gt(sql`${castNum(invoices.totalAmount)} - ${castNum(invoices.amountPaid)}`, 0)
                )
            ).orderBy(desc(invoices.issueDate)).limit(5),
            // Due Purchases (Supplier Debts > 0)
            db.select({
                id: purchaseInvoices.id,
                supplier: purchaseInvoices.supplierName,
                amount: sql`${castNum(purchaseInvoices.totalAmount)} - ${castNum(purchaseInvoices.amountPaid)}`,
                date: purchaseInvoices.issueDate
            }).from(purchaseInvoices).where(
                and(
                    eq(purchaseInvoices.tenantId, tenantId),
                    gt(sql`${castNum(purchaseInvoices.totalAmount)} - ${castNum(purchaseInvoices.amountPaid)}`, 0)
                )
            ).orderBy(desc(purchaseInvoices.issueDate)).limit(5)
        ]);

        return {
            role: 'admin',
            data: {
                totalRevenue: revenueRes?.value || "0.00",
                totalAccounts: accRes?.value || 0,
                activeProducts: prodRes?.value || 0,
                invoicesCount: invRes?.value || 0,
                totalReceivables: recRes?.value || "0.00",
                lowStockItems: lowStockItems.map(p => ({
                    id: p.id,
                    name: p.name,
                    quantity: p.stockQuantity
                })),
                overdueInvoices,
                duePurchases
            }
        };
    } catch (e) {
        console.error("Dashboard stats error", e);
        return { role: 'admin', data: null, error: true };
    }
}

export async function getAnalyticsData() {
    const session = await getSession();
    const tenantId = session?.tenantId;
    if (!tenantId) return null;

    try {
        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;
        const getMonthSql = (col: any) => isPg ? sql`TO_CHAR(${col}, 'MM')` : sql`strftime('%m', ${col})`;

        const [topProducts, incomeCompare] = await Promise.all([
            // 1. Top 5 Products by Sales
            db.select({
                name: products.name,
                value: sql<number>`SUM(${castNum(sql`invoice_items.quantity`)})`
            })
                .from(products)
                .innerJoin(sql`invoice_items`, sql`invoice_items.product_id = products.id`)
                .innerJoin(invoices, sql`invoice_items.invoice_id = invoices.id`)
                .where(and(eq(products.tenantId, tenantId), eq(invoices.type, 'sale')))
                .groupBy(products.id)
                .orderBy(desc(sql`SUM(${castNum(sql`invoice_items.quantity`)})`))
                .limit(5),

            // 2. Profit vs Expense (Simple Monthly Aggregate)
            db.select({
                month: getMonthSql(journalEntries.transactionDate),
                profit: sql<number>`SUM(CASE WHEN ${accounts.type} IN ('revenue', 'income') THEN ${castNum(journalLines.credit)} - ${castNum(journalLines.debit)} ELSE 0 END)`,
                expense: sql<number>`SUM(CASE WHEN ${accounts.type} = 'expense' THEN ${castNum(journalLines.debit)} - ${castNum(journalLines.credit)} ELSE 0 END)`
            })
                .from(journalLines)
                .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
                .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
                .where(eq(journalEntries.tenantId, tenantId))
                .groupBy(getMonthSql(journalEntries.transactionDate))
                .orderBy(getMonthSql(journalEntries.transactionDate))
                .limit(12)
        ]);

        return {
            topProducts,
            incomeCompare: incomeCompare.map(i => ({
                name: `شهر ${i.month}`,
                ربح: Number(i.profit || 0),
                مصروف: Number(i.expense || 0)
            }))
        };
    } catch (e) {
        console.error("Analytics Data Error", e);
        return null;
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
