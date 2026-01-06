"use server";

import { db } from "@/db";
import { accounts, journalEntries, journalLines, tenants, invoices, products } from "@/db/schema";
import { and, eq, gte, lte, sql, or } from "drizzle-orm";
import { getSession } from "@/features/auth/actions";
import { getActiveTenantId } from "@/lib/actions-utils";

export async function getIncomeStatementData(startDate: Date, endDate: Date) {
    const session = await getSession();
    // FIX: Secure tenant ID
    const tenantId = session?.tenantId || await getActiveTenantId();
    if (!tenantId) throw new Error("No tenant found");

    // 2. Fetch Revenue
    // Revenue = Sum(Credit) - Sum(Debit) WHERE Account.Type = 'revenue' AND Date in Range
    const revenueResult = await db
        .select({
            totalCredit: sql<number>`sum(${journalLines.credit})`,
            totalDebit: sql<number>`sum(${journalLines.debit})`,
        })
        .from(journalLines)
        .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .where(
            and(
                eq(journalEntries.tenantId, tenantId),
                // Relaxed condition: Type is revenue OR income OR Name contains Sales/Revenue
                or(
                    eq(accounts.type, 'revenue'),
                    eq(accounts.type, 'income'),
                    sql`${accounts.name} LIKE '%مبيعات%'`,
                    sql`${accounts.name} LIKE '%Sales%'`,
                    sql`${accounts.name} LIKE '%Revenue%'`
                ),
                gte(journalEntries.transactionDate, startDate.toISOString().split('T')[0]),
                lte(journalEntries.transactionDate, endDate.toISOString().split('T')[0])
            )
        );

    const totalRevenue = (Number(revenueResult[0]?.totalCredit) || 0) - (Number(revenueResult[0]?.totalDebit) || 0);

    // 3. Fetch Expenses
    // Expenses = Sum(Debit) - Sum(Credit) WHERE Account.Type = 'expense' AND Date in Range
    const expenseResult = await db
        .select({
            totalCredit: sql<number>`sum(${journalLines.credit})`,
            totalDebit: sql<number>`sum(${journalLines.debit})`,
        })
        .from(journalLines)
        .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .where(
            and(
                eq(journalEntries.tenantId, tenantId),
                eq(accounts.type, 'expense'),
                gte(journalEntries.transactionDate, startDate.toISOString().split('T')[0]),
                lte(journalEntries.transactionDate, endDate.toISOString().split('T')[0])
            )
        );

    const totalExpenses = (Number(expenseResult[0]?.totalDebit) || 0) - (Number(expenseResult[0]?.totalCredit) || 0);

    // 4. Net Profit
    const netProfit = totalRevenue - totalExpenses;

    // 5. Detailed Expenses Breakdown
    const expenseDetails = await db
        .select({
            accountName: accounts.name,
            totalDebit: sql<number>`sum(${journalLines.debit})`,
            totalCredit: sql<number>`sum(${journalLines.credit})`,
        })
        .from(journalLines)
        .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .where(
            and(
                eq(journalEntries.tenantId, tenantId),
                eq(accounts.type, 'expense'),
                gte(journalEntries.transactionDate, startDate.toISOString().split('T')[0]),
                lte(journalEntries.transactionDate, endDate.toISOString().split('T')[0])
            )
        )
        .groupBy(accounts.name);

    const formattedExpenses = expenseDetails.map(item => ({
        name: item.accountName,
        value: (Number(item.totalDebit) || 0) - (Number(item.totalCredit) || 0)
    })).filter(item => item.value > 0);

    return {
        totalRevenue,
        totalExpenses,
        netProfit,
        expenseDetails: formattedExpenses
    };
}

export async function getProfitExport() {
    const { getSession } = await import("@/features/auth/actions");
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'SUPER_ADMIN')) {
        return [];
    }

    // Default to Current Year
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);

    try {
        const data = await getIncomeStatementData(startOfYear, endOfYear);

        // Flatten for Excel
        const rows = [
            { "البند": "إجمالي الإيرادات", "القيمة": Number(data.totalRevenue.toFixed(2)) },
            { "البند": "إجمالي المصروفات", "القيمة": Number(data.totalExpenses.toFixed(2)) },
            { "البند": "صافي الربح / الخسارة", "القيمة": Number(data.netProfit.toFixed(2)) },
            { "البند": "", "القيمة": "" }, // Spacer
            { "البند": "تفاصيل المصروفات:", "القيمة": "" },
        ];

        data.expenseDetails.forEach(exp => {
            rows.push({
                "البند": exp.name,
                "القيمة": Number(exp.value.toFixed(2))
            });
        });

        return rows;
    } catch (e) {
        console.error("Profit Export Error", e);
        return [];
    }

}

export async function getSalesSummary() {
    const session = await getSession();
    const tenantId = session?.tenantId || await getActiveTenantId();
    if (!tenantId) return null;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

    // Helper to get sum
    const getSum = async (dateCondition: any) => {
        const result = await db.select({
            total: sql<number>`sum(${invoices.totalAmount})`,
            count: sql<number>`count(${invoices.id})`
        })
            .from(invoices)
            .where(
                and(
                    eq(invoices.tenantId, tenantId),
                    dateCondition
                )
            );
        return result[0] || { total: 0, count: 0 };
    };

    const daily = await getSum(gte(invoices.issueDate, startOfDay));
    const monthly = await getSum(gte(invoices.issueDate, startOfMonth));
    const yearly = await getSum(gte(invoices.issueDate, startOfYear));

    return {
        daily: { total: Number(daily.total || 0), count: daily.count },
        monthly: { total: Number(monthly.total || 0), count: monthly.count },
        yearly: { total: Number(yearly.total || 0), count: yearly.count },
    };
}

export async function getInventoryReport() {
    const session = await getSession();
    const tenantId = session?.tenantId || await getActiveTenantId();
    if (!tenantId) return null;

    // Fetch all GOODS (exclude services)
    const allProducts = await db.select().from(products)
        .where(
            and(
                eq(products.tenantId, tenantId),
                eq(products.type, 'goods')
            )
        );

    let totalCostValue = 0;
    let totalSalesValue = 0;
    let lowStockItems: typeof allProducts = [];
    const LOW_STOCK_THRESHOLD = 5;

    allProducts.forEach(product => {
        const qty = Number(product.stockQuantity || 0);
        const cost = Number(product.buyPrice || 0);
        const price = Number(product.sellPrice || 0);

        if (qty > 0) {
            totalCostValue += (qty * cost);
            totalSalesValue += (qty * price);
        }

        if (qty <= LOW_STOCK_THRESHOLD) {
            lowStockItems.push(product);
        }
    });

    return {
        totalItems: allProducts.length,
        totalCostValue,
        totalSalesValue,
        potentialProfit: totalSalesValue - totalCostValue,
        lowStockItems: lowStockItems.sort((a, b) => Number(a.stockQuantity) - Number(b.stockQuantity))
    };
}

