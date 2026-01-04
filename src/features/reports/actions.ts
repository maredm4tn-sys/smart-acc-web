"use server";

import { db } from "@/db";
import { accounts, journalEntries, journalLines, tenants } from "@/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
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
                eq(accounts.type, 'revenue'),
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
