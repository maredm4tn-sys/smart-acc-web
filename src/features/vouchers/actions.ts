"use server";

import { db } from "@/db";
import { vouchers, accounts, customers, suppliers } from "@/db/schema";
import { eq, and, like, desc, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/tenant-security";
import { getSession } from "@/features/auth/actions";
import { z } from "zod";
import { createJournalEntry } from "@/features/accounting/actions";

const createVoucherSchema = z.object({
    type: z.enum(['receipt', 'payment']), // receipt, payment
    date: z.string(),
    amount: z.number().positive(),
    description: z.string().optional(),
    reference: z.string().optional(),
    partyType: z.enum(['customer', 'supplier', 'other']).optional(),
    partyId: z.number().optional(),
    accountId: z.number().optional(),
});

export async function createVoucher(input: z.infer<typeof createVoucherSchema>) {
    const validation = createVoucherSchema.safeParse(input);
    if (!validation.success) return { success: false, message: "Invalid Data" };

    const data = validation.data;

    try {
        const tenantId = await requireTenant();

        // 1. Generate Number (Efficiently)
        const [countRes] = await db.select({ value: count() }).from(vouchers).where(eq(vouchers.tenantId, tenantId));
        const voucherCount = Number(countRes?.value || 0);
        const prefix = data.type === 'receipt' ? 'RV' : 'PV';
        const number = `${prefix}-${(voucherCount + 1).toString().padStart(6, '0')}`;

        // 2. Create Voucher
        const formattedDate = data.date.includes('T') ? data.date.split('T')[0] : data.date;

        const session = await getSession();
        const [newVoucher] = await db.insert(vouchers).values({
            tenantId,
            voucherNumber: number,
            type: data.type as 'receipt' | 'payment',
            date: formattedDate,
            amount: Number(data.amount).toFixed(2),
            description: data.description,
            reference: data.reference,
            partyType: data.partyType as any,
            partyId: data.partyId ? Number(data.partyId) : null,
            accountId: data.accountId ? Number(data.accountId) : null,
            status: 'posted',
            createdBy: session?.userId
        }).returning();

        // 3. Journal Entry Logic
        // Find Cash Account (Using simple search for now)
        let cashAccount = await db.query.accounts.findFirst({
            where: (acc, { and, eq, like }) => and(
                eq(acc.tenantId, tenantId),
                like(acc.name, '%نقدية%')
            )
        });

        if (!cashAccount) {
            cashAccount = await db.query.accounts.findFirst({
                where: (acc, { and, eq, like }) => and(eq(acc.tenantId, tenantId), like(acc.name, '%Cash%'))
            });
        }

        if (!cashAccount) {
            // Find by code 101...
            cashAccount = await db.query.accounts.findFirst({
                where: (acc, { and, eq, like }) => and(eq(acc.tenantId, tenantId), like(acc.code, '101%'))
            });
        }

        if (!cashAccount) {
            const [newCash] = await db.insert(accounts).values({
                tenantId, name: "الخزينة (Cash)", code: "101001", type: 'asset'
            }).returning();
            cashAccount = newCash;
        }

        let targetAccountId: number | null = null;
        let targetDescription = "";

        if (data.partyType === 'other' && data.accountId) {
            targetAccountId = data.accountId;
            targetDescription = "حساب عام";
        } else if (data.partyType === 'customer' && data.partyId) {
            const customer = await db.query.customers.findFirst({
                where: (cust, { eq, and }) => and(eq(cust.id, data.partyId!), eq(cust.tenantId, tenantId))
            });
            if (customer) {
                const arAccount = await getOrCreateSpecificAccount(tenantId, customer.name, '102', 'asset');
                targetAccountId = arAccount.id;
                targetDescription = `العميل: ${customer.name}`;
            }
        } else if (data.partyType === 'supplier' && data.partyId) {
            const supplier = await db.query.suppliers.findFirst({
                where: (supp, { eq, and }) => and(eq(supp.id, data.partyId!), eq(supp.tenantId, tenantId))
            });
            if (supplier) {
                const apAccount = await getOrCreateSpecificAccount(tenantId, supplier.name, '201', 'liability');
                targetAccountId = apAccount.id;
                targetDescription = `المورد: ${supplier.name}`;
            }
        }

        if (cashAccount && targetAccountId) {
            const lines: any[] = [];

            // Note: Journal Entry requires accountId, debit, credit
            if (data.type === 'receipt') {
                // Receipt: Cash Debit, Target Credit
                lines.push({ accountId: cashAccount!.id, debit: data.amount, credit: 0, description: `قبض (استلام) - ${targetDescription}` });
                lines.push({ accountId: targetAccountId, debit: 0, credit: data.amount, description: `سداد من ${targetDescription}` });
            } else {
                // Payment: Target Debit, Cash Credit
                lines.push({ accountId: targetAccountId, debit: data.amount, credit: 0, description: `صرف (سداد) - ${targetDescription}` });
                lines.push({ accountId: cashAccount!.id, debit: 0, credit: data.amount, description: `صرف نقدية` });
            }

            // Call existing logic to create journal
            await createJournalEntry({
                date: data.date,
                reference: newVoucher.voucherNumber,
                description: `${data.type === 'receipt' ? 'سند قبض' : 'سند صرف'} - ${data.description || ''}`,
                lines: lines
            });
        }

        revalidatePath('/dashboard/vouchers');
        return { success: true, message: "Voucher Created", id: newVoucher.id };
    } catch (e: any) {
        console.error("Create Voucher Error:", e);
        return {
            success: false,
            message: `فشل السند: ${e.message}${e.detail ? ' - ' + e.detail : ''}${e.code ? ' (Code: ' + e.code + ')' : ''}`
        };
    }
}

async function getOrCreateSpecificAccount(tenantId: string, name: string, codePrefix: string, type: any) {
    // Search by name
    let account = await db.query.accounts.findFirst({
        where: (acc, { and, eq, sql }) => and(
            eq(acc.tenantId, tenantId),
            sql`trim(lower(${acc.name})) = trim(lower(${name}))`
        )
    });

    if (!account) {
        // Create new
        const code = `${codePrefix}-${Date.now().toString().slice(-4)}`;
        const [newAcc] = await db.insert(accounts).values({
            tenantId,
            name,
            code,
            type,
            balance: '0'
        }).returning();
        account = newAcc;
    }
    return account;
}

export async function getVouchers() {
    try {
        const tenantId = await requireTenant();
        console.log("Fetching vouchers for tenant:", tenantId);

        const data = await db.query.vouchers.findMany({
            where: eq(vouchers.tenantId, tenantId),
            orderBy: [desc(vouchers.createdAt)],
            with: {
                createdByUser: true,
                account: true
            }
        });
        return data || [];
    } catch (e: any) {
        console.error("DEBUG: getVouchers Failed", e);
        // Return empty instead of crashing the Page
        return [];
    }
}
