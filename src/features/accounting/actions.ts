"use server";

import { db } from "@/db";
import { accounts, journalEntries, journalLines, fiscalYears, tenants } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { sql, eq, gte, and } from "drizzle-orm";
import { z } from "zod";
import { requireTenant } from "@/lib/tenant-security";

const journalEntrySchema = z.object({
    date: z.string().min(1),
    description: z.string().optional(),
    lines: z.array(z.object({
        accountId: z.number(),
        description: z.string().optional(),
        debit: z.number().nonnegative(),
        credit: z.number().nonnegative(),
    })).min(2).refine(lines => {
        const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
        const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
        return Math.abs(totalDebit - totalCredit) < 0.01;
    }, "Entry must be balanced (Debit = Credit)"),
    // tenantId: z.string().optional(), // Removed from effective schema logic (input ignored)
    reference: z.string().optional(),
    currency: z.string().optional(),
    exchangeRate: z.number().optional(),
});

type JournalEntryInput = z.infer<typeof journalEntrySchema>;


export type MyJournalResult = { success: boolean; message: string; };

export async function createJournalEntry(inputData: JournalEntryInput, tx?: any): Promise<MyJournalResult> {
    const validation = journalEntrySchema.safeParse(inputData);
    if (!validation.success) {
        throw new Error("Invalid Entry Data");
    }
    const data = validation.data;

    // Use the provided transaction or the global db
    const queryDb = tx || db;

    try {
        const tenantId = await requireTenant();

        // Find open fiscal year
        let fy = await queryDb.query.fiscalYears.findFirst({
            where: (fy: any, { eq, and }: any) => and(eq(fy.tenantId, tenantId), eq(fy.isClosed, false))
        });

        if (!fy) {
            const currentYear = new Date().getFullYear();
            try {
                // If finding/creating fiscal year involves inserts, use queryDb
                const result = await queryDb.insert(fiscalYears).values({
                    tenantId: tenantId,
                    name: currentYear.toString(),
                    startDate: `${currentYear}-01-01`,
                    endDate: `${currentYear}-12-31`,
                }).returning();
                fy = result[0];
            } catch (err) {
                return { success: false, message: "Could not create fiscal year" };
            }
        }

        const fyId = fy.id;

        // Fix for PG: truncate ISO date
        const formattedDate = data.date.includes('T') ? data.date.split('T')[0] : data.date;

        // Insert Header
        const [entry] = await queryDb.insert(journalEntries).values({
            tenantId: tenantId,
            fiscalYearId: fyId,
            entryNumber: `JE-${Date.now()}`,
            transactionDate: formattedDate,
            description: data.description,
            reference: data.reference,
            currency: data.currency || "EGP",
            exchangeRate: (data.exchangeRate || 1).toString(),
            status: "posted",
            createdAt: new Date(), // Explicitly set to ensure ms precision
        }).returning();

        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;
        // Insert Lines
        for (const line of data.lines) {
            await queryDb.insert(journalLines).values({
                journalEntryId: entry.id,
                accountId: line.accountId,
                description: line.description || data.description,
                debit: line.debit.toString(),
                credit: line.credit.toString(),
            });

            await queryDb.update(accounts)
                .set({
                    balance: sql`${castNum(accounts.balance)} + ${line.debit} - ${line.credit}`
                })
                .where(eq(accounts.id, line.accountId));
        }

        /*
        try {
            // Revalidation should normally happen outside tx if possible, but safe here
            if (!tx) {
                revalidatePath("/dashboard/journal");
                revalidatePath("/dashboard/accounts");
            }
        } catch (e) { }
        */

        return { success: true, message: "تم ترحيل القيد بنجاح" };
    } catch (error) {
        console.error("Error creating journal:", error);
        return { success: false, message: `حدث خطأ: ${(error as Error).message}` };
    }
}

export async function deleteJournalEntry(id: number, tx?: any): Promise<MyJournalResult> {
    const queryDb = tx || db;
    try {
        const tenantId = await requireTenant();

        // 1. Get Entry and Lines for reversal
        const entry = await queryDb.query.journalEntries.findFirst({
            where: and(eq(journalEntries.id, id), eq(journalEntries.tenantId, tenantId)),
            with: { lines: true }
        });

        if (!entry) return { success: false, message: "القيد غير موجود" };

        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

        // 2. Revert Balance for each line
        for (const line of entry.lines) {
            await queryDb.update(accounts)
                .set({
                    // Reverse: -debit +credit
                    balance: sql`${castNum(accounts.balance)} - ${line.debit} + ${line.credit}`
                })
                .where(eq(accounts.id, line.accountId));
        }

        // 3. Delete Lines & Header
        await queryDb.delete(journalLines).where(eq(journalLines.journalEntryId, id));
        await queryDb.delete(journalEntries).where(eq(journalEntries.id, id));

        /*
        if (!tx) {
            revalidatePath("/dashboard/journal");
            revalidatePath("/dashboard/accounts");
        }
        */

        return { success: true, message: "تم حذف القيد وتعديل الأرصدة" };
    } catch (error) {
        console.error("Error deleting journal:", error);
        return { success: false, message: "فشل حذف القيد" };
    }
}

const createAccountSchema = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
    parentId: z.number().nullable(),
    tenantId: z.string().optional()
});

type CreateAccountInput = z.infer<typeof createAccountSchema>;

export async function createAccount(inputData: CreateAccountInput) {
    const validation = createAccountSchema.safeParse(inputData);
    if (!validation.success) {
        return { success: false, message: "Invalid Account Data" };
    }
    const data = validation.data;

    try {
        const tenantId = await requireTenant();

        const existing = await db.query.accounts.findFirst({
            where: (accounts, { eq, and }) => and(eq(accounts.code, data.code), eq(accounts.tenantId, tenantId))
        });

        if (existing) {
            return { success: false, message: "رقم الحساب مستخدم من قبل" };
        }

        await db.insert(accounts).values({
            tenantId: tenantId,
            code: data.code,
            name: data.name,
            type: data.type,
            parentId: data.parentId || null,
            isActive: true, // Default
            balance: '0.00', // Start with 0
        });

        revalidatePath("/dashboard/accounts");
        return { success: true, message: "تم إنشاء الحساب بنجاح" };

    } catch (error) {
        console.error("Error creating account:", error);
        return { success: false, message: "حدث خطأ أثناء إنشاء الحساب" };
    }
}

export async function getJournalEntries(limit = 50) {
    try {
        const tenantId = await requireTenant();
        const entries = await db.query.journalEntries.findMany({
            where: (journalEntries, { eq }) => eq(journalEntries.tenantId, tenantId),
            orderBy: (journalEntries, { desc }) => [desc(journalEntries.transactionDate), desc(journalEntries.createdAt)],
            limit: limit,
            with: {
                lines: {
                    with: {
                        account: true
                    }
                }
            }
        });

        // Enrich Data without changing the schema
        return entries.map(entry => {
            const debitTotal = entry.lines.reduce((sum, line) => sum + Number(line.debit), 0);
            const creditTotal = entry.lines.reduce((sum, line) => sum + Number(line.credit), 0);

            // Accounts Summary: Get unique account names
            const accountNames = Array.from(new Set(entry.lines.map(l => l.account.name)));
            // Format: "Cash / Sales ..."
            const accountsSummary = accountNames.slice(0, 2).join(" / ") + (accountNames.length > 2 ? " ..." : "");

            // Infer Type from description/reference until we have a dedicated column
            let type = "Manual";
            const ref = entry.reference?.toUpperCase() || "";
            const desc = entry.description?.toUpperCase() || "";

            if (ref.startsWith("INV") || desc.includes("INVOICE") || desc.includes("فاتورة")) type = "Invoice";
            else if (ref.startsWith("PAY") || desc.includes("PAYMENT") || desc.includes("دفع")) type = "Payment";

            return {
                ...entry,
                debitTotal,
                creditTotal,
                accountsSummary,
                type
            };
        });
    } catch (error) {
        console.error("Error fetching journal entries:", error);
        return [];
    }
}


export async function deleteAccount(accountId: number) {
    try {
        // 1. Check for children
        const children = await db.select().from(accounts).where(sql`${accounts.parentId} = ${accountId}`);
        if (children.length > 0) {
            return { success: false, message: "لا يمكن حذف حساب رئيسي يحتوي على حسابات فرعية" };
        }

        // 2. Check for journal entries (transactions)
        const entries = await db.select().from(journalLines).where(sql`${journalLines.accountId} = ${accountId}`).limit(1);
        if (entries.length > 0) {
            return { success: false, message: "لا يمكن حذف هذا الحساب لوجود عمليات مالية مرتبطة به" };
        }

        // 3. Delete
        await db.delete(accounts).where(sql`${accounts.id} = ${accountId}`);

        try {
            revalidatePath("/dashboard/accounts");
        } catch (e) { }

        return { success: true, message: "تم حذف الحساب بنجاح" };
    } catch (error) {
        console.error("Error deleting account:", error);
        return { success: false, message: "فشل الحذف" };
    }
}

export async function seedDefaultAccounts(tenantId: string) {
    // This is a helper specific to "Import" / "Seed" request 
    // Basic Egyptian Accounting Standard structure (Simplified)
    try {
        const { getActiveTenantId } = await import("@/lib/actions-utils");
        const tId = await getActiveTenantId(tenantId);

        const rootAssets = await createAccount({ code: '1000', name: 'الأصول', type: 'asset', parentId: null, tenantId: tId });
        const rootLiabilities = await createAccount({ code: '2000', name: 'الخصوم', type: 'liability', parentId: null, tenantId: tId });
        const rootEquity = await createAccount({ code: '3000', name: 'حقوق الملكية', type: 'equity', parentId: null, tenantId: tId });
        const rootRevenue = await createAccount({ code: '4000', name: 'الإيرادات', type: 'revenue', parentId: null, tenantId: tId });
        const rootExpenses = await createAccount({ code: '5000', name: 'المصروفات', type: 'expense', parentId: null, tenantId: tId });

        return { success: true, message: "تم استيراد الدليل الافتراضي" };
    } catch (e) {
        return { success: false, message: "حدث خطأ أثناء الاستيراد" };
    }
}

export async function getJournalExport() {
    const { getSession } = await import("@/features/auth/actions");
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'SUPER_ADMIN')) {
        return [];
    }

    try {
        const tenantId = await requireTenant();
        const entries = await db.query.journalEntries.findMany({
            where: (journalEntries, { eq }) => eq(journalEntries.tenantId, tenantId),
            orderBy: (journalEntries, { desc }) => [desc(journalEntries.transactionDate)],
            with: { lines: { with: { account: true } } }
        });

        return entries.map(entry => {
            const debitTotal = entry.lines.reduce((sum, line) => sum + Number(line.debit), 0);
            const creditTotal = entry.lines.reduce((sum, line) => sum + Number(line.credit), 0);
            const accountNames = Array.from(new Set(entry.lines.map(l => l.account.name)));
            const accountsSummary = accountNames.join(" / ");

            let type = "يدوي";
            const ref = entry.reference?.toUpperCase() || "";
            const desc = entry.description?.toUpperCase() || "";
            if (ref.startsWith("INV") || desc.includes("INVOICE") || desc.includes("فاتورة")) type = "فاتورة";
            else if (ref.startsWith("PAY") || desc.includes("PAYMENT") || desc.includes("دفع")) type = "دفعة";

            return {
                "رقم القيد": entry.entryNumber,
                "التاريخ": new Date(entry.transactionDate).toLocaleDateString('en-GB'),
                "النوع": type,
                "البيان": entry.description,
                "الحسابات": accountsSummary,
                "إجمالي مدين": debitTotal,
                "إجمالي دائن": creditTotal,
                "العملة": entry.currency,
                "الحالة": entry.status === 'posted' ? 'مرحل' : 'مسودة'
            };
        });
    } catch (e) {
        console.error("Export Error", e);
        return [];
    }

}

export async function getExpenseAccounts() {
    const tenantId = await requireTenant();
    return db.query.accounts.findMany({
        where: (accounts, { eq, and }) => and(
            eq(accounts.tenantId, tenantId),
            eq(accounts.type, 'expense'),
            eq(accounts.isActive, true)
        )
    });
}

const expenseSchema = z.object({
    accountId: z.number(),
    amount: z.number().positive(),
    date: z.string(),
    description: z.string().optional()
});

export async function createExpense(input: z.infer<typeof expenseSchema>) {
    const tenantId = await requireTenant();

    // 1. Find Cash/Treasury Account (Credit side)
    // Try to find an account with 'cash' or 'treasury' or 'خزينة' in name, or just pick first Asset
    const cashAccount = await db.query.accounts.findFirst({
        where: (accounts, { eq, and, or, like }) => and(
            eq(accounts.tenantId, tenantId),
            eq(accounts.type, 'asset'),
            or(
                like(accounts.name, '%cash%'),
                like(accounts.name, '%khazna%'),
                like(accounts.name, '%خزينة%'),
                like(accounts.name, '%نقدية%')
            )
        )
    });

    if (!cashAccount) {
        return { success: false, message: "لم يتم العثور على حساب خزينة (نقدية) للصرف منه." };
    }

    // 2. Create Journal Entry
    // Debit: Expense Account
    // Credit: Cash Account
    return createJournalEntry({
        date: input.date,
        description: input.description || "تسجيل مصروف",
        reference: `EXP-${Date.now()}`,
        currency: "EGP",
        lines: [
            {
                accountId: input.accountId, // Expense
                debit: input.amount,
                credit: 0,
                description: input.description
            },
            {
                accountId: cashAccount.id, // Cash
                debit: 0,
                credit: input.amount,
                description: "صرف نقدية"
            }
        ]
    });

}

export async function getExpensesList(limit = 20) {
    const tenantId = await requireTenant();


    // Better Approach: Use db.select with joins
    const results = await db.select({
        id: journalLines.id,
        date: journalEntries.transactionDate,
        accountName: accounts.name,
        amount: journalLines.debit,
        description: journalLines.description,
        entryNumber: journalEntries.entryNumber,
        reference: journalEntries.reference
    })
        .from(journalLines)
        .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .where(and(
            eq(accounts.tenantId, tenantId),
            eq(accounts.type, 'expense')
        ))
        .orderBy(sql`${journalEntries.transactionDate} DESC`, sql`${journalEntries.createdAt} DESC`)
        .limit(limit);

    // Calculate Monthly Total
    const now = new Date();
    // Start of current month in YYYY-MM-DD
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().split('T')[0];

    const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
    const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

    const monthlySum = await db.select({
        total: sql<number>`sum(${castNum(journalLines.debit)})`
    })
        .from(journalLines)
        .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .where(and(
            eq(accounts.tenantId, tenantId),
            eq(accounts.type, 'expense'),
            gte(journalEntries.transactionDate, startOfMonth)
        ));

    return {
        expenses: results.map(r => ({
            ...r,
            amount: Number(r.amount)
        })),
        monthlyTotal: Number(monthlySum[0]?.total || 0)
    };
}

