"use server";

import { db } from "@/db";
import { accounts, journalEntries, journalLines, tenants, invoices, products, purchaseInvoices, customers, suppliers, categories, invoiceItems } from "@/db/schema";
import { and, eq, gte, lte, sql, or, desc, like } from "drizzle-orm";
import { getSession } from "@/features/auth/actions";
import { getActiveTenantId } from "@/lib/actions-utils";

export async function getIncomeStatementData(startDate: Date, endDate: Date) {
    const session = await getSession();
    // FIX: Secure tenant ID
    const tenantId = session?.tenantId || await getActiveTenantId();
    if (!tenantId) throw new Error("No tenant found");

    const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
    const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

    // 2. Fetch Revenue
    // Revenue = Sum(Credit) - Sum(Debit) WHERE Account.Type = 'revenue' AND Date in Range
    const revenueResult = await db
        .select({
            totalCredit: sql<number>`sum(${castNum(journalLines.credit)})`,
            totalDebit: sql<number>`sum(${castNum(journalLines.debit)})`,
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

    // --- Calculate Installment Interest Separately for the Report ---
    const interestRes = await db.select({
        totalInterest: sql`SUM(${castNum(invoices.installmentInterest)})`
    })
        .from(invoices)
        .where(and(
            eq(invoices.tenantId, tenantId),
            gte(invoices.issueDate, startDate.toISOString().split('T')[0]),
            lte(invoices.issueDate, endDate.toISOString().split('T')[0]),
            eq(invoices.isInstallment, true)
        ));

    const interestIncome = Number(interestRes[0]?.totalInterest || 0);

    // 3. Fetch Expenses
    // Expenses = Sum(Debit) - Sum(Credit) WHERE Account.Type = 'expense' AND Date in Range
    const expenseResult = await db
        .select({
            totalCredit: sql<number>`sum(${castNum(journalLines.credit)})`,
            totalDebit: sql<number>`sum(${castNum(journalLines.debit)})`,
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
            date: journalEntries.transactionDate,
            createdAt: journalEntries.createdAt, // Added createdAt
            entryNumber: journalEntries.entryNumber, // Added entryNumber for fallback
            description: journalEntries.description,
            accountName: accounts.name,
            reference: journalEntries.reference,
            totalDebit: journalLines.debit,
            totalCredit: journalLines.credit,
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
        .orderBy(desc(journalEntries.transactionDate), desc(journalEntries.id)); // Sort by Date DESC, then ID DESC (Newest First)

    const formattedExpenses = expenseDetails.map(item => ({
        date: item.date,
        createdAt: item.createdAt, // Pass createdAt
        entryNumber: item.entryNumber, // Pass entryNumber
        name: item.description || item.accountName,
        accountName: item.accountName,
        value: (Number(item.totalDebit) || 0) - (Number(item.totalCredit) || 0)
    })).filter(item => item.value > 0);

    // 6. Detailed Revenue Breakdown - Subtract Interest from main sales to show it separate
    const revenueDetails = await db
        .select({
            date: journalEntries.transactionDate,
            createdAt: journalEntries.createdAt, // Added createdAt
            entryNumber: journalEntries.entryNumber, // Added entryNumber for fallback
            description: journalEntries.description,
            accountName: accounts.name,
            reference: journalEntries.reference,
            totalDebit: journalLines.debit,
            totalCredit: journalLines.credit,
        })
        .from(journalLines)
        .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .where(
            and(
                eq(journalEntries.tenantId, tenantId),
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
        )
        .orderBy(desc(journalEntries.transactionDate), desc(journalEntries.id)); // Sort by Date DESC, then ID DESC (Newest First)

    let formattedRevenue = revenueDetails.map(item => ({
        date: item.date,
        createdAt: item.createdAt, // Pass createdAt
        entryNumber: item.entryNumber, // Pass entryNumber
        name: item.description || item.accountName,
        accountName: item.accountName,
        value: (Number(item.totalCredit) || 0) - (Number(item.totalDebit) || 0)
    })).filter(item => item.value > 0);

    // If we have interest income, adjust the first "Sales" item in formattedRevenue (heuristic)
    // or just add it as a new virtual line item
    if (interestIncome > 0) {
        formattedRevenue = formattedRevenue.map(rev => {
            if (rev.accountName.includes("مبيعات") || rev.accountName.toLocaleLowerCase().includes("sales")) {
                // This is a bit risky but good for visualization
                // However, since interest was included in the invoice total which was posted to sales, 
                // we should deduct the TOTAL interest from the TOTAL sales in the report display.
            }
            return rev;
        });

        // Add virtual interest income row
        formattedRevenue.push({
            date: endDate.toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            entryNumber: 0,
            name: "إجمالي فوائد التقسيط (Interest Income)",
            accountName: "فوائد التقسيط",
            value: interestIncome
        });

        // Deduct interest from other revenue rows so total stays correct
        // We deduct it from the first sales row we find
        const salesIdx = formattedRevenue.findIndex(r => r.accountName.includes("مبيعات") || r.accountName.toLowerCase().includes("sales"));
        if (salesIdx !== -1) {
            formattedRevenue[salesIdx].value -= interestIncome;
            formattedRevenue[salesIdx].name += " (بعد خصم الفوائد)";
        }
    }

    return {
        totalRevenue: totalRevenue,
        totalExpenses: totalExpenses,
        netProfit: netProfit,
        interestIncome: interestIncome,
        expenseDetails: formattedExpenses,
        revenueDetails: formattedRevenue
    };
}

export async function getProfitExport() {
    const { getDictionary } = await import("@/lib/i18n-server");
    const dict = await getDictionary();
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
            { [dict.Reports.IncomeStatement.Table.Item]: dict.Reports.IncomeStatement.TotalRevenue, [dict.Reports.IncomeStatement.Table.Value]: Number(data.totalRevenue.toFixed(2)) },
            { [dict.Reports.IncomeStatement.Table.Item]: dict.Reports.IncomeStatement.TotalExpenses, [dict.Reports.IncomeStatement.Table.Value]: Number(data.totalExpenses.toFixed(2)) },
            { [dict.Reports.IncomeStatement.Table.Item]: dict.Reports.IncomeStatement.NetProfit, [dict.Reports.IncomeStatement.Table.Value]: Number(data.netProfit.toFixed(2)) },
            { [dict.Reports.IncomeStatement.Table.Item]: "", [dict.Reports.IncomeStatement.Table.Value]: "" }, // Spacer
            { [dict.Reports.IncomeStatement.Table.Item]: dict.Reports.IncomeStatement.RevenueDetails + ":", [dict.Reports.IncomeStatement.Table.Value]: "" },
        ];

        // Add Revenue Details
        if (data.revenueDetails && data.revenueDetails.length > 0) {
            data.revenueDetails.forEach(rev => {
                rows.push({
                    [dict.Reports.IncomeStatement.Table.Item]: rev.name,
                    [dict.Reports.IncomeStatement.Table.Value]: Number(rev.value.toFixed(2))
                });
            });
        } else {
            rows.push({ [dict.Reports.IncomeStatement.Table.Item]: dict.Reports.IncomeStatement.Table.NoRevenues, [dict.Reports.IncomeStatement.Table.Value]: 0 });
        }


        rows.push({ [dict.Reports.IncomeStatement.Table.Item]: "", [dict.Reports.IncomeStatement.Table.Value]: "" }); // Spacer
        rows.push({ [dict.Reports.IncomeStatement.Table.Item]: dict.Reports.IncomeStatement.ExpenseDetails + ":", [dict.Reports.IncomeStatement.Table.Value]: "" });

        // Add Expense Details
        if (data.expenseDetails && data.expenseDetails.length > 0) {
            data.expenseDetails.forEach(exp => {
                rows.push({
                    [dict.Reports.IncomeStatement.Table.Item]: exp.name,
                    [dict.Reports.IncomeStatement.Table.Value]: Number(exp.value.toFixed(2))
                });
            });
        } else {
            rows.push({ [dict.Reports.IncomeStatement.Table.Item]: dict.Reports.IncomeStatement.Table.NoExpenses, [dict.Reports.IncomeStatement.Table.Value]: 0 });
        }


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
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const startOfDay = formatDate(now);
    const startOfMonth = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const startOfYear = formatDate(new Date(now.getFullYear(), 0, 1));

    const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
    const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

    // Helper to get sum
    const getSum = async (dateCondition: any) => {
        const result = await db.select({
            total: sql<number>`sum(${castNum(invoices.totalAmount)})`,
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

    try {
        // Parallel Fetching for all dashboard metrics
        const [
            daily,
            monthly,
            yearly,
            customerDebtsRes,
            supplierDebtsRes,
            productsCount,
            customersCount,
            suppliersCount,
            cashBalanceRes,
            vatCollectedRes,
            vatPaidRes,
            inventoryItems
        ] = await Promise.all([
            getSum(gte(invoices.issueDate, startOfDay)),
            getSum(gte(invoices.issueDate, startOfMonth)),
            getSum(gte(invoices.issueDate, startOfYear)),
            db.select({
                total: sql<number>`sum(${castNum(invoices.totalAmount)} - ${castNum(invoices.amountPaid)})`
            }).from(invoices).where(and(eq(invoices.tenantId, tenantId), eq(invoices.type, 'sale'))),
            db.select({
                total: sql<number>`sum(${castNum(purchaseInvoices.totalAmount)} - ${castNum(purchaseInvoices.amountPaid)})`
            }).from(purchaseInvoices).where(and(eq(purchaseInvoices.tenantId, tenantId), eq(purchaseInvoices.type, 'purchase'))),
            db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.tenantId, tenantId)),
            db.select({ count: sql<number>`count(*)` }).from(customers).where(eq(customers.tenantId, tenantId)),
            db.select({ count: sql<number>`count(*)` }).from(suppliers).where(eq(suppliers.tenantId, tenantId)),
            db.select({
                balance: sql<number>`sum(${castNum(journalLines.debit)}) - sum(${castNum(journalLines.credit)})`
            }).from(journalLines).innerJoin(accounts, eq(journalLines.accountId, accounts.id)).where(
                and(
                    eq(accounts.tenantId, tenantId),
                    or(like(accounts.name, '%نقدية%'), like(accounts.name, '%خزينة%'), like(accounts.name, '%Cash%'))
                )
            ),
            db.select({
                total: sql<number>`sum(${castNum(invoices.totalAmount)} * 0.14 / 1.14)`
            }).from(invoices).where(and(eq(invoices.tenantId, tenantId), eq(invoices.type, 'sale'))),
            db.select({
                total: sql<number>`sum(${castNum(purchaseInvoices.totalAmount)} * 0.14 / 1.14)`
            }).from(purchaseInvoices).where(and(eq(purchaseInvoices.tenantId, tenantId), eq(purchaseInvoices.type, 'purchase'))),
            db.select({
                stock: products.stockQuantity,
                price: products.buyPrice
            }).from(products).where(and(eq(products.tenantId, tenantId), eq(products.type, 'goods')))
        ]);

        const totalInventoryValue = inventoryItems.reduce((acc, item) => acc + (Number(item.stock || 0) * Number(item.price || 0)), 0);

        return {
            daily: { total: Number(daily.total || 0), count: daily.count },
            monthly: { total: Number(monthly.total || 0), count: monthly.count },
            yearly: { total: Number(yearly.total || 0), count: yearly.count },
            customerDebts: Number(customerDebtsRes[0]?.total || 0),
            supplierDebts: Number(supplierDebtsRes[0]?.total || 0),
            productsCount: productsCount[0]?.count || 0,
            customersCount: customersCount[0]?.count || 0,
            suppliersCount: suppliersCount[0]?.count || 0,
            cashBalance: Number(cashBalanceRes[0]?.balance || 0),
            vatCollected: Number(vatCollectedRes[0]?.total || 0),
            vatPaid: Number(vatPaidRes[0]?.total || 0),
            inventoryValue: totalInventoryValue,
        };
    } catch (e) {
        console.error("DEBUG: getSalesSummary Failed", e);
        return null;
    }
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

export async function getCategorySales(startDate: Date, endDate: Date) {
    const { getDictionary } = await import("@/lib/i18n-server");
    const dict = await getDictionary();
    const session = await getSession();
    const tenantId = session?.tenantId || await getActiveTenantId();
    if (!tenantId) return [];

    const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
    const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

    try {
        const data = await db
            .select({
                categoryName: categories.name,
                totalAmount: sql<number>`sum(${castNum(invoiceItems.unitPrice)} * ${castNum(invoiceItems.quantity)})`,
                count: sql<number>`count(${invoiceItems.id})`,
            })
            .from(invoiceItems)
            .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
            .innerJoin(products, eq(invoiceItems.productId, products.id))
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(
                and(
                    eq(invoices.tenantId, tenantId),
                    gte(invoices.issueDate, startDate.toISOString().split('T')[0]),
                    lte(invoices.issueDate, endDate.toISOString().split('T')[0])
                )
            )
            .groupBy(categories.id, categories.name)
            .orderBy(desc(sql`sum(${castNum(invoiceItems.unitPrice)} * ${castNum(invoiceItems.quantity)})`));

        return data.map(item => ({
            name: item.categoryName || dict.Common?.Uncategorized || "General / عام",
            value: Number(item.totalAmount) || 0,
            count: Number(item.count) || 0
        }));
    } catch (e) {
        console.error("Category Report Error", e);
        return [];
    }
}

export async function getStagnantProducts(days: number = 30) {
    const session = await getSession();
    const tenantId = session?.tenantId || await getActiveTenantId();
    if (!tenantId) throw new Error("Unauthorized");

    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(now.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // 1. Get all stocked goods created BEFORE the cutoff (to avoid flagging new items)
    // We only care about items that HAVE stock. If stock is 0, it's not stagnant capital.
    const stockItems = await db
        .select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            stock: products.stockQuantity,
            buyPrice: products.buyPrice,
            sellPrice: products.sellPrice,
            createdAt: products.createdAt
        })
        .from(products)
        .where(
            and(
                eq(products.tenantId, tenantId),
                eq(products.type, 'goods'),
                sql`CAST(${products.stockQuantity} as REAL) > 0`
            )
        );

    // 2. Get IDs of products sold within the period (since cutoff)
    const soldItems = await db
        .selectDistinct({ productId: invoiceItems.productId })
        .from(invoiceItems)
        .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
        .where(
            and(
                eq(invoices.tenantId, tenantId),
                gte(invoices.issueDate, cutoffStr)
            )
        );

    const soldIds = new Set(soldItems.map(i => i.productId));

    // 3. Filter stagnant items
    const stagnantItems = stockItems.filter(item => {
        // Exclude if sold recently
        if (soldIds.has(item.id)) return false;

        // Exclude if created recently (give it a chance)
        // If createdAt is null, assume it's old -> include it.
        if (item.createdAt) {
            const created = new Date(item.createdAt);
            if (created > cutoffDate) return false;
        }

        return true;
    });

    // 4. Calculate Totals
    let totalStockValue = 0;
    const itemsWithValues = stagnantItems.map(item => {
        const stockVal = (Number(item.stock) * Number(item.buyPrice || 0));
        totalStockValue += stockVal;
        return {
            ...item,
            stockValue: stockVal
        };
    });

    return {
        data: itemsWithValues.sort((a, b) => b.stockValue - a.stockValue), // Sort by highest value stuck
        totalValue: totalStockValue,
        cutoffDate: cutoffStr
    };
}
