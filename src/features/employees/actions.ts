"use server";

import { db } from "@/db";
import { employees, advances, payrolls, attendance, journalEntries, journalLines, accounts } from "@/db/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/tenant-security";
import { z } from "zod";
import { createJournalEntry } from "@/features/accounting/actions";

// --- Employee Schemas ---
const employeeSchema = z.object({
    id: z.number().optional(),
    code: z.string().min(1),
    name: z.string().min(1),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    basicSalary: z.string(),
    notes: z.string().optional(),
});

// --- Advance Schemas ---
const advanceSchema = z.object({
    employeeId: z.number(),
    date: z.string(),
    salaryMonth: z.string(),
    amount: z.string(),
    type: z.enum(["advance", "repayment"]),
    treasuryAccountId: z.number(),
    notes: z.string().optional(),
});

// --- Payroll Schemas ---
const payrollSchema = z.object({
    employeeId: z.number(),
    paymentDate: z.string(),
    salaryMonth: z.string(),
    basicSalary: z.string(),
    incentives: z.string(),
    deductions: z.string(),
    advanceDeductions: z.string(),
    netSalary: z.string(),
    treasuryAccountId: z.number(),
    notes: z.string().optional(),
});

// --- Employee Actions ---
export async function getEmployees() {
    const tenantId = await requireTenant();
    const data = await db.query.employees.findMany({
        where: eq(employees.tenantId, tenantId),
        orderBy: desc(employees.createdAt),
    });

    return data.map(emp => ({
        ...emp,
        basicSalary: Number(emp.basicSalary || 0)
    }));
}

export async function upsertEmployee(data: z.infer<typeof employeeSchema>) {
    const tenantId = await requireTenant();
    const validated = employeeSchema.parse(data);

    try {
        if (validated.id) {
            await db.update(employees)
                .set({
                    ...validated,
                    email: validated.email || null,
                })
                .where(and(eq(employees.id, validated.id), eq(employees.tenantId, tenantId)));
        } else {
            await db.insert(employees).values({
                ...validated,
                tenantId,
                email: validated.email || null,
            });
        }
        revalidatePath("/dashboard/employees");
        return { success: true };
    } catch (e) {
        console.error("Employee Upsert Error:", e);
        return { success: false, message: "فشل حفظ بيانات الموظف" };
    }
}

export async function deleteEmployee(id: number) {
    const tenantId = await requireTenant();
    try {
        await db.delete(employees).where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)));
        revalidatePath("/dashboard/employees");
        return { success: true };
    } catch (e) {
        return { success: false, message: "لا يمكن حذف الموظف لوجود سجلات مرتبطة به" };
    }
}

// --- Advance Actions ---
export async function createAdvance(data: z.infer<typeof advanceSchema>) {
    const tenantId = await requireTenant();
    const validated = advanceSchema.parse(data);

    try {
        return await db.transaction(async (tx) => {
            // 1. Record the Advance
            const [advance] = await tx.insert(advances).values({
                ...validated,
                tenantId,
            }).returning();

            // 2. Create Accounting Entry
            const isAdvance = validated.type === 'advance';

            // Find or create "سلف موظفين" account
            let advanceAcc = await tx.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, tenantId), sql`${accounts.name} LIKE '%سلف%'`)
            });

            if (!advanceAcc) {
                const rootAssets = await tx.query.accounts.findFirst({
                    where: and(eq(accounts.tenantId, tenantId), eq(accounts.type, 'asset'), sql`${accounts.parentId} IS NULL`)
                });
                const [newAcc] = await tx.insert(accounts).values({
                    tenantId,
                    code: '1205',
                    name: 'سلف موظفين',
                    type: 'asset',
                    parentId: rootAssets?.id || null,
                    balance: '0.00'
                }).returning();
                advanceAcc = newAcc;
            }

            await createJournalEntry({
                date: validated.date,
                description: `${isAdvance ? 'صرف' : 'استرداد'} سلفة موظف: ${validated.notes || ''}`,
                reference: `ADV-${advance.id}`,
                lines: [
                    {
                        accountId: isAdvance ? advanceAcc.id : validated.treasuryAccountId,
                        debit: Number(validated.amount),
                        credit: 0,
                        description: isAdvance ? `صرف سلفة لموظف` : `استرداد سلفة من موظف`
                    },
                    {
                        accountId: isAdvance ? validated.treasuryAccountId : advanceAcc.id,
                        debit: 0,
                        credit: Number(validated.amount),
                        description: isAdvance ? `صرف من الخزينة` : `إيداع في الخزينة`
                    }
                ]
            }, tx);

            revalidatePath("/dashboard/employees");
            return { success: true };
        });
    } catch (e) {
        console.error("Advance Error:", e);
        return { success: false, message: "فشل تسجيل العملية" };
    }
}

// --- Payroll Actions ---
export async function processPayroll(data: z.infer<typeof payrollSchema>) {
    const tenantId = await requireTenant();
    const validated = payrollSchema.parse(data);

    try {
        return await db.transaction(async (tx) => {
            // 1. Record Payroll
            const [payroll] = await tx.insert(payrolls).values({
                ...validated,
                tenantId,
            }).returning();

            // 2. Mark Advances as Deducted for this employee and month
            if (Number(validated.advanceDeductions) > 0) {
                await tx.update(advances)
                    .set({ status: 'deducted' })
                    .where(and(
                        eq(advances.employeeId, validated.employeeId),
                        eq(advances.salaryMonth, validated.salaryMonth),
                        eq(advances.type, 'advance'),
                        eq(advances.status, 'pending')
                    ));
            }

            // 3. Create Accounting Entry
            // Debit: Salaries Expense (Full Net + Deductions? No, let's keep it simple)
            // Let's do:
            // Debit: Salaries Expense (Basic + Incentives)
            // Credit: Treasury (Net Salary)
            // Credit: Advances Account (Advance Deductions)
            // Credit: Other Income/Misc (Deductions/Penalties)

            let salaryExpenseAcc = await tx.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, tenantId), sql`${accounts.name} LIKE '%رواتب%'`, eq(accounts.type, 'expense'))
            });

            if (!salaryExpenseAcc) {
                const rootExp = await tx.query.accounts.findFirst({
                    where: and(eq(accounts.tenantId, tenantId), eq(accounts.type, 'expense'), sql`${accounts.parentId} IS NULL`)
                });
                const [newAcc] = await tx.insert(accounts).values({
                    tenantId,
                    code: '5101',
                    name: 'مصروفات رواتب وأجور',
                    type: 'expense',
                    parentId: rootExp?.id || null,
                    balance: '0.00'
                }).returning();
                salaryExpenseAcc = newAcc;
            }

            let advanceAcc = await tx.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, tenantId), sql`${accounts.name} LIKE '%سلف%'`)
            });

            const lines = [
                {
                    accountId: salaryExpenseAcc.id,
                    debit: Number(validated.basicSalary) + Number(validated.incentives),
                    credit: 0,
                    description: `رواتب شهر ${validated.salaryMonth}`
                },
                {
                    accountId: validated.treasuryAccountId,
                    debit: 0,
                    credit: Number(validated.netSalary),
                    description: `صافي الراتب المنصرف`
                }
            ];

            if (Number(validated.advanceDeductions) > 0 && advanceAcc) {
                lines.push({
                    accountId: advanceAcc.id,
                    debit: 0,
                    credit: Number(validated.advanceDeductions),
                    description: `خصم سلف رصيد`
                });
            }

            if (Number(validated.deductions) > 0) {
                // Credit to a misc income or just reduce expense? 
                // Usually it's better to show it as a separate credit line or reduce the debit.
                // We'll add a line for "خصومات جزاءات"
                let penaltyAcc = await tx.query.accounts.findFirst({
                    where: and(eq(accounts.tenantId, tenantId), sql`${accounts.name} LIKE '%جزاءات%'`)
                });
                if (!penaltyAcc) {
                    const [newAcc] = await tx.insert(accounts).values({
                        tenantId,
                        code: '4205',
                        name: 'إيرادات جزاءات ومخالفات',
                        type: 'revenue',
                        parentId: null,
                        balance: '0.00'
                    }).returning();
                    penaltyAcc = newAcc;
                }
                lines.push({
                    accountId: penaltyAcc.id,
                    debit: 0,
                    credit: Number(validated.deductions),
                    description: `خصومات وجزاءات موظفين`
                });
            }

            await createJournalEntry({
                date: validated.paymentDate,
                description: `صرف رواتب شهر ${validated.salaryMonth}`,
                reference: `PAY-${payroll.id}`,
                lines
            }, tx);

            revalidatePath("/dashboard/employees");
            return { success: true };
        });
    } catch (e) {
        console.error("Payroll Error:", e);
        return { success: false, message: "فشل معالجة الراتب" };
    }
}

export async function getEmployeeStatement(employeeId: number, startDate: string, endDate: string) {
    const tenantId = await requireTenant();

    // Fetch all movements for this employee
    const employeePayrolls = await db.query.payrolls.findMany({
        where: and(
            eq(payrolls.employeeId, employeeId),
            eq(payrolls.tenantId, tenantId),
            sql`CAST(${payrolls.paymentDate} AS DATE) >= CAST(${startDate} AS DATE)`,
            sql`CAST(${payrolls.paymentDate} AS DATE) <= CAST(${endDate} AS DATE)`
        ),
        orderBy: desc(payrolls.paymentDate)
    });

    const employeeAdvances = await db.query.advances.findMany({
        where: and(
            eq(advances.employeeId, employeeId),
            eq(advances.tenantId, tenantId),
            sql`CAST(${advances.date} AS DATE) >= CAST(${startDate} AS DATE)`,
            sql`CAST(${advances.date} AS DATE) <= CAST(${endDate} AS DATE)`
        ),
        orderBy: desc(advances.date)
    });

    return {
        payrolls: employeePayrolls,
        advances: employeeAdvances
    };
}

export async function getAttendance(date: string) {
    const tenantId = await requireTenant();
    return db.query.attendance.findMany({
        where: and(eq(attendance.tenantId, tenantId), eq(attendance.date, date)),
        with: {
            employee: true
        }
    });
}

export async function recordAttendance(data: {
    employeeId: number;
    date: string;
    checkIn?: string;
    checkOut?: string;
    status: string;
    notes?: string;
}) {
    const tenantId = await requireTenant();
    try {
        // Check if already exists for this date and employee
        const existing = await db.query.attendance.findFirst({
            where: and(
                eq(attendance.tenantId, tenantId),
                eq(attendance.employeeId, data.employeeId),
                eq(attendance.date, data.date)
            )
        });

        if (existing) {
            await db.update(attendance)
                .set({ ...data })
                .where(eq(attendance.id, existing.id));
        } else {
            await db.insert(attendance).values({
                ...data,
                tenantId
            });
        }
        revalidatePath("/dashboard/employees");
        return { success: true };
    } catch (e) {
        console.error("Attendance Error:", e);
        return { success: false, message: "فشل تسجيل الحضور" };
    }
}
