"use server";

import { db } from "@/db";
import { shifts, invoices, vouchers } from "@/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { getSession } from "@/features/auth/actions";
import { getActiveTenantId } from "@/lib/actions-utils";
import { revalidatePath } from "next/cache";

export async function getActiveShift() {
    const session = await getSession();
    if (!session) return null;

    const tenantId = session.tenantId || await getActiveTenantId();
    if (!tenantId) return null;

    try {
        const activeShift = await db.query.shifts.findFirst({
            where: and(
                eq(shifts.tenantId, tenantId),
                eq(shifts.userId, session.userId),
                eq(shifts.status, 'open')
            ),
            orderBy: [desc(shifts.startTime)]
        });

        return activeShift || null;
    } catch (e) {
        console.error("Error getting active shift:", e);
        return null;
    }
}

export async function openShift(startBalance: number) {
    const session = await getSession();
    if (!session) return { success: false, message: "Unauthorized" };

    const tenantId = session.tenantId || await getActiveTenantId();

    try {
        // Check if already open
        const active = await getActiveShift();
        if (active) return { success: false, message: "You already have an open shift." };

        // Get last shift number to increment
        const lastShift = await db.query.shifts.findFirst({
            where: and(eq(shifts.tenantId, tenantId)),
            orderBy: [desc(shifts.shiftNumber)]
        });

        const nextNumber = (lastShift?.shiftNumber || 0) + 1;

        const [newShift] = await db.insert(shifts).values({
            tenantId,
            userId: session.userId,
            shiftNumber: nextNumber,
            startBalance: String(startBalance),
            status: 'open',
            startTime: new Date(),
        }).returning();

        revalidatePath("/dashboard/pos");
        return { success: true, data: newShift };
    } catch (e) {
        console.error("Error opening shift:", e);
        return { success: false, message: "Failed to open shift" };
    }
}

export async function getShiftSummary(shiftId: number) {
    try {
        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

        // Invoices Totals
        const invStats = await db.select({
            totalCash: sql<number>`sum(case when ${invoices.paymentMethod} = 'cash' then ${castNum(invoices.totalAmount)} else 0 end)`,
            totalVisa: sql<number>`sum(case when ${invoices.paymentMethod} = 'card' then ${castNum(invoices.totalAmount)} else 0 end)`,
            totalUnpaid: sql<number>`sum(case when ${invoices.paymentStatus} != 'paid' then ${castNum(invoices.totalAmount)} - ${castNum(invoices.amountPaid)} else 0 end)`,
        })
            .from(invoices)
            .where(eq(invoices.shiftId, shiftId));

        // Vouchers (Receipts - Payments) affecting Cash
        // Receipt (Grab Money) -> Add to Cash
        // Payment (Spend Money) -> Subtract from Cash
        // Only if they are linked to this shift and are 'cash' type (usually vouchers are cash unless specified bank)
        // For simplicity, assume all vouchers in shift are cash related for now or check account type if possible.
        // Let's simplified: Vouchers in shift affect cash.
        const voucherStats = await db.select({
            totalReceipts: sql<number>`sum(case when ${vouchers.type} = 'receipt' then ${castNum(vouchers.amount)} else 0 end)`,
            totalPayments: sql<number>`sum(case when ${vouchers.type} = 'payment' then ${castNum(vouchers.amount)} else 0 end)`,
        })
            .from(vouchers)
            .where(eq(vouchers.shiftId, shiftId));

        const cashSales = invStats[0]?.totalCash || 0;
        const visaSales = invStats[0]?.totalVisa || 0;
        const unpaidSales = invStats[0]?.totalUnpaid || 0;

        const receipts = voucherStats[0]?.totalReceipts || 0;
        const payments = voucherStats[0]?.totalPayments || 0;

        return {
            cashSales,
            visaSales,
            unpaidSales,
            receipts,
            payments,
            netCashMovement: cashSales + receipts - payments
        };
    } catch (e) {
        console.error("Error calculating shift summary:", e);
        return { cashSales: 0, visaSales: 0, unpaidSales: 0, receipts: 0, payments: 0, netCashMovement: 0 };
    }
}

export async function closeShift(shiftId: number, actualCash: number, notes?: string) {
    const session = await getSession();
    const tenantId = session?.tenantId || await getActiveTenantId();
    // Strict check: if on web, we really should have a tenantId from session
    if (!tenantId) return { success: false, message: "Unauthorized" };

    try {
        const shift = await db.query.shifts.findFirst({
            where: (s, { eq, and }) => and(eq(s.id, shiftId), eq(s.tenantId, tenantId))
        });
        if (!shift || shift.status !== 'open') return { success: false, message: "Shift not found or already closed" };

        const summary = await getShiftSummary(shiftId);

        // Expected System Cash = Start Balance + Net Cash Movement
        const startBal = Number(shift.startBalance || 0);
        const expectedCash = startBal + summary.netCashMovement;

        await db.update(shifts).set({
            endBalance: String(actualCash),
            systemCashBalance: String(expectedCash),
            systemVisaBalance: String(summary.visaSales),
            systemUnpaidBalance: String(summary.unpaidSales),
            status: 'closed',
            endTime: new Date(),
            notes: notes
        }).where(and(eq(shifts.id, shiftId), eq(shifts.tenantId, tenantId)));

        revalidatePath("/dashboard/pos");
        return { success: true };
    } catch (e) {
        console.error("Error closing shift:", e);
        return { success: false, message: "Failed to close shift" };
    }
}
