"use server";

import { db } from "@/db";
import { accounts, journalEntries, journalLines, tenants } from "@/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";

export async function getIncomeStatementData(startDate: Date, endDate: Date) {
    // 1. Get Tenant (Assuming single tenant for now 'default' or picking the first one, 
    // real app would get from session).
    const [tenant] = await db.select().from(tenants).limit(1);
    if (!tenant) throw new Error("No tenant found");

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
