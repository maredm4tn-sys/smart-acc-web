"use server";

import { db } from "@/db";
import { representatives, invoices, accounts } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { desc, eq, and, like, sql } from "drizzle-orm";
import { z } from "zod";
import { requireTenant } from "@/lib/tenant-security";
import { getDictionary } from "@/lib/i18n-server";

const representativeSchema = z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().optional(),
    address: z.string().optional(),
    type: z.enum(["sales", "delivery"]).default("sales"),
    salary: z.coerce.number().min(0).default(0),
    commissionType: z.enum(["percentage", "fixed_per_invoice"]).default("percentage"),
    commissionRate: z.coerce.number().min(0).default(0),
    notes: z.string().optional(),
});

export type RepresentativeFormValues = z.infer<typeof representativeSchema>;

export async function getRepresentatives(
    page: number = 1,
    limit: number = 10,
    search?: string,
    type?: string
) {
    const tenantId = await requireTenant();

    const offset = (page - 1) * limit;

    const conditions = [eq(representatives.tenantId, tenantId)];

    if (search) {
        conditions.push(like(representatives.name, `%${search}%`));
    }

    if (type && type !== 'all') {
        conditions.push(eq(representatives.type, type));
    }

    const whereClause = and(...conditions);

    const data = await db
        .select()
        .from(representatives)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(representatives.createdAt));

    const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(representatives)
        .where(whereClause);

    const totalCount = countResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    const result = {
        representatives: data.map(rep => ({
            ...rep,
            commissionRate: Number(rep.commissionRate || 0),
            salary: Number(rep.salary || 0),
            createdAt: rep.createdAt ? rep.createdAt.toISOString() : null
        })),
        totalPages,
        totalCount,
        currentPage: page,
    };

    return JSON.parse(JSON.stringify(result));
}

export async function getAllRepresentatives() {
    const tenantId = await requireTenant();

    const data = await db
        .select()
        .from(representatives)
        .where(and(eq(representatives.tenantId, tenantId), eq(representatives.isActive, true)))
        .orderBy(representatives.name);

    const result = data.map(rep => ({
        ...rep,
        commissionRate: Number(rep.commissionRate || 0),
        salary: Number(rep.salary || 0),
        createdAt: rep.createdAt ? rep.createdAt.toISOString() : null
    }));

    return JSON.parse(JSON.stringify(result));
}

export async function createRepresentative(data: RepresentativeFormValues) {
    try {
        const tenantId = await requireTenant();

        const parsed = representativeSchema.parse(data);

        await db.insert(representatives).values({
            tenantId: tenantId,
            name: parsed.name,
            phone: parsed.phone,
            address: parsed.address,
            type: parsed.type as "sales" | "delivery",
            salary: parsed.salary.toString(),
            commissionType: parsed.commissionType,
            commissionRate: parsed.commissionRate.toString(),
            notes: parsed.notes,
        });

        revalidatePath("/dashboard/representatives");
        return { success: true };
    } catch (e: any) {
        console.error("Create representative error:", e);
        return { success: false, message: e.message };
    }
}

export async function updateRepresentative(id: number, data: RepresentativeFormValues) {
    try {
        const tenantId = await requireTenant();

        const parsed = representativeSchema.parse(data);

        await db
            .update(representatives)
            .set({
                name: parsed.name,
                phone: parsed.phone,
                address: parsed.address,
                type: parsed.type as "sales" | "delivery",
                salary: parsed.salary.toString(),
                commissionType: parsed.commissionType,
                commissionRate: parsed.commissionRate.toString(),
                notes: parsed.notes,
            })
            .where(and(eq(representatives.id, id), eq(representatives.tenantId, tenantId)));

        revalidatePath("/dashboard/representatives");
        return { success: true };
    } catch (e: any) {
        console.error("Update representative error:", e);
        return { success: false, message: e.message };
    }
}

export async function deleteRepresentative(id: number) {
    try {
        const tenantId = await requireTenant();

        // Check for dependencies (invoices)
        // Using as any for invoices.representativeId if TS complains, but it should be there.
        // If invoices comes from sqlite schema it has it.
        const inv: any = invoices;

        const linkedInvoices = await db
            .select({ id: inv.id })
            .from(inv)
            .where(eq(inv.representativeId, id))
            .limit(1);

        if (linkedInvoices.length > 0) {
            return { success: false, message: "Cannot delete representative linked to invoices." };
        }

        await db
            .delete(representatives)
            .where(and(eq(representatives.id, id), eq(representatives.tenantId, tenantId)));

        revalidatePath("/dashboard/representatives");
        return { success: true };
    } catch (e: any) {
        console.error("Delete representative error:", e);
        return { success: false, message: e.message };
    }
}

export async function getRepresentativeReport(
    id: number,
    startDate: string,
    endDate: string
) {
    const tenantId = await requireTenant();

    try {
        const representative = await db.query.representatives.findFirst({
            where: and(eq(representatives.id, id), eq(representatives.tenantId, tenantId))
        });

        if (!representative) return null;

        // Fetch invoices
        // We will calculate total sales and total paid for commission
        const repInvoices = await db.select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            date: invoices.issueDate,
            totalAmount: invoices.totalAmount,
            amountPaid: invoices.amountPaid,
            customerName: invoices.customerName,
            status: invoices.status,
            paymentStatus: invoices.paymentStatus
        })
            .from(invoices)
            .where(and(
                eq(invoices.tenantId, tenantId),
                eq(invoices.representativeId, id),
                sql`CAST(${invoices.issueDate} AS DATE) >= CAST(${startDate} AS DATE)`,
                sql`CAST(${invoices.issueDate} AS DATE) <= CAST(${endDate} AS DATE)`
            ))
            .orderBy(desc(invoices.issueDate));

        let totalSales = 0;
        let totalCollected = 0;
        let invoicesCount = repInvoices.length;

        repInvoices.forEach(inv => {
            totalSales += Number(inv.totalAmount);
            totalCollected += Number(inv.amountPaid);
        });

        const commissionRate = Number(representative.commissionRate) || 0;
        const commissionType = representative.commissionType || 'percentage';
        const salary = Number(representative.salary) || 0;

        // Commission Logic:
        let commissionAmount = 0;

        if (commissionType === 'percentage') {
            commissionAmount = (totalSales * commissionRate) / 100;
        } else if (commissionType === 'fixed_per_invoice') {
            commissionAmount = invoicesCount * commissionRate;
        }

        // Total Due (Salary + Commission)
        // If report covers a full month, we might assume full salary, but for now just showing it as "Monthly Salary" ref.
        const totalDue = commissionAmount; // Salary is separate line item generally.

        return {
            representative,
            invoices: repInvoices,
            summary: {
                totalSales,
                totalCollected,
                invoicesCount,
                commissionRate,
                commissionType,
                salary,
                commissionAmount,
                totalDue
            }
        };

    } catch (e) {
        console.error("Report Error:", e);
        return null;
    }
}

const payCommissionSchema = z.object({
    representativeId: z.number(),
    amount: z.number().positive(),
    date: z.string(),
    period: z.string(), // "2024-01-01 to 2024-01-31" to record in description
    notes: z.string().optional()
});

export async function payRepresentativeCommission(inputData: z.infer<typeof payCommissionSchema>) {
    const dict = await getDictionary();
    const validation = payCommissionSchema.safeParse(inputData);
    if (!validation.success) return { success: false, message: "Invalid Data" };

    const data = validation.data;

    try {
        const tenantId = await requireTenant();

        const representative = await db.query.representatives.findFirst({
            where: and(eq(representatives.id, data.representativeId), eq(representatives.tenantId, tenantId))
        });

        if (!representative) return { success: false, message: "Representative not found" };

        // 1. Find Accounts (Commission Expense Account & Cash Account)
        let commissionAccount = await db.query.accounts.findFirst({
            where: (accounts, { like, and, eq, or }) => and(
                eq(accounts.tenantId, tenantId),
                eq(accounts.type, 'expense'),
                or(like(accounts.name, '%عمولات%'), like(accounts.name, '%Commission%'))
            )
        });

        if (!commissionAccount) {
            // Create Default Commission Account
            const [newAcc] = await db.insert(accounts).values({
                tenantId,
                name: "عمولات بيع وتوزيع (تلقائي)",
                code: `502-${Date.now().toString().slice(-4)}`,
                type: 'expense',
                currency: 'EGP',
                balance: '0'
            }).returning();
            commissionAccount = newAcc;
        }

        let cashAccount = await db.query.accounts.findFirst({
            where: (accounts, { like, and, eq, or }) => and(
                eq(accounts.tenantId, tenantId),
                eq(accounts.type, 'asset'),
                or(like(accounts.name, '%نقدية%'), like(accounts.name, '%Cash%'), like(accounts.name, '%Treasury%'))
            )
        });

        if (!cashAccount) {
            return { success: false, message: "لم يتم العثور على حساب نقدية للصرف منه." };
        }

        // 2. Create Journal Entry
        // Debit: Commission Expense
        // Credit: Cash
        const { createJournalEntry } = await import("@/features/accounting/actions");

        const description = `صرف مستحقات مندوب: ${representative.name} - عن الفترة: ${data.period} ${data.notes ? `(${data.notes})` : ''}`;

        const result = await createJournalEntry({
            date: data.date,
            description: description,
            reference: `COMM-${representative.id}-${Date.now().toString().slice(-6)}`,
            currency: 'EGP',
            lines: [
                {
                    accountId: commissionAccount.id,
                    debit: data.amount,
                    credit: 0,
                    description: description
                },
                {
                    accountId: cashAccount.id,
                    debit: 0,
                    credit: data.amount,
                    description: "صرف نقدية - عمولات"
                }
            ]
        });

        if (!result.success) {
            return { success: false, message: `فشل إنشاء القيد: ${result.message}` };
        }

        revalidatePath("/dashboard/journal");
        revalidatePath("/dashboard/accounts");

        return { success: true, message: "تم صرف المستحقات وتسجيل القيد بنجاح" };

    } catch (e: any) {
        console.error("Pay Commission Error:", e);
        return { success: false, message: e.message };
    }
}
