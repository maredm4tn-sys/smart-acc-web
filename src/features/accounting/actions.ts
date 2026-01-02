"use server";

import { db } from "@/db";
import { accounts, journalEntries, journalLines, fiscalYears, tenants } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";

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
    tenantId: z.string().optional(),
    reference: z.string().optional(),
    currency: z.string().optional(),
    exchangeRate: z.number().optional(),
});

type JournalEntryInput = z.infer<typeof journalEntrySchema>;

export async function createJournalEntry(inputData: JournalEntryInput) {
    const validation = journalEntrySchema.safeParse(inputData);
    if (!validation.success) {
        return { success: false, message: "Invalid Entry Data: " + validation.error.errors[0].message };
    }
    const data = validation.data;

    try {
        const { getActiveTenantId } = await import("@/lib/actions-utils");
        const tenantId = await getActiveTenantId(data.tenantId);

        // Find open fiscal year
        let fy = await db.query.fiscalYears.findFirst({
            where: (fy, { eq, and }) => and(eq(fy.tenantId, tenantId), eq(fy.isClosed, false))
        });

        if (!fy) {
            const currentYear = new Date().getFullYear();
            try {
                [fy] = await db.insert(fiscalYears).values({
                    tenantId: tenantId,
                    name: currentYear.toString(),
                    startDate: `${currentYear}-01-01`,
                    endDate: `${currentYear}-12-31`,
                }).returning();
            } catch (err) {
                return { success: false, message: "Could not create fiscal year" };
            }
        }

        const fyId = fy.id;

        // Insert Header
        const [entry] = await db.insert(journalEntries).values({
            tenantId: tenantId,
            fiscalYearId: fyId,
            entryNumber: `JE-${Date.now()}`,
            transactionDate: data.date,
            description: data.description,
            reference: data.reference,
            currency: data.currency || "EGP",
            exchangeRate: (data.exchangeRate || 1).toString(),
            status: "posted",
        }).returning();

        // Insert Lines
        for (const line of data.lines) {
            await db.insert(journalLines).values({
                journalEntryId: entry.id,
                accountId: line.accountId,
                description: line.description || data.description,
                debit: line.debit.toString(),
                credit: line.credit.toString(),
            });

            await db.execute(sql`
                UPDATE ${accounts} 
                SET balance = balance + ${line.debit} - ${line.credit}
                WHERE id = ${line.accountId}
            `);
        }

        try {
            revalidatePath("/dashboard/journal");
            revalidatePath("/dashboard/accounts");
        } catch (e) { }

        return { success: true, message: "تم ترحيل القيد بنجاح" };
    } catch (error) {
        console.error("Error creating journal:", error);
        return { success: false, message: "حدث خطأ أثناء حفظ القيد" };
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
        const { getActiveTenantId } = await import("@/lib/actions-utils");
        const tenantId = await getActiveTenantId(data.tenantId);

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
        const entries = await db.query.journalEntries.findMany({
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
        return entries;
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
