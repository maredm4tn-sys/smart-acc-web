"use server";

import { db } from "@/db";
import { users, invoices, products, customers, journalEntries, accounts, auditLogs, tenants, suppliers, vouchers, purchaseInvoices, purchaseInvoiceItems, invoiceItems, journalLines } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getSession } from "@/features/auth/actions";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

async function checkSuperAdmin() {
    const session = await getSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
        throw new Error("Unauthorized: Super Admin access required");
    }
    return session;
}

async function checkAdmin() {
    const session = await getSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'admin')) {
        throw new Error("Unauthorized: Admin access required");
    }
    return session;
}

export async function resetSubscriberData(tenantId: string) {
    try {
        const session = await getSession();
        if (!session) throw new Error("Unauthorized");

        if (session.role !== 'SUPER_ADMIN' && session.tenantId !== tenantId) {
            throw new Error("Unauthorized: You can only reset your own data");
        }

        const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
        if (!tenant) return { error: "Tenant not found" };

        // Transactional delete in correct order for PostgreSQL
        await db.transaction(async (tx) => {
            // Level 4: Details/Items
            await tx.delete(journalLines).where(sql`journal_entry_id IN (SELECT id FROM journal_entries WHERE tenant_id = ${tenantId})`);
            await tx.delete(invoiceItems).where(sql`invoice_id IN (SELECT id FROM invoices WHERE tenant_id = ${tenantId})`);
            await tx.delete(purchaseInvoiceItems).where(sql`purchase_invoice_id IN (SELECT id FROM purchase_invoices WHERE tenant_id = ${tenantId})`);

            // Level 3: Headers
            await tx.delete(invoices).where(eq(invoices.tenantId, tenantId));
            await tx.delete(purchaseInvoices).where(eq(purchaseInvoices.tenantId, tenantId));
            await tx.delete(vouchers).where(eq(vouchers.tenantId, tenantId));
            await tx.delete(journalEntries).where(eq(journalEntries.tenantId, tenantId));

            // Level 2: Master Data
            await tx.delete(products).where(eq(products.tenantId, tenantId));
            await tx.delete(customers).where(eq(customers.tenantId, tenantId));
            await tx.delete(suppliers).where(eq(suppliers.tenantId, tenantId));

            // Note: We keeping Accounts as they define the COA
            // Optional: reset account balances
            await tx.update(accounts).set({ balance: "0" }).where(eq(accounts.tenantId, tenantId));

            // Audit
            await tx.insert(auditLogs).values({
                tenantId: tenantId,
                userId: session.userId,
                action: "FACTORY_RESET",
                entity: "SYSTEM",
                entityId: tenantId,
                details: `Factory reset performed for tenant ${tenant.name}`,
                createdAt: new Date(),
            });
        });

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error: any) {
        console.error("Reset Subscriber Data Error:", error);
        return { error: `فشل إعادة الضبط: ${error.message || "خطأ داخلي"}` };
    }
}

export async function toggleUserStatus(userId: string) {
    try {
        await checkSuperAdmin();

        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (!user) return { error: "User not found" };

        const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        const newIsActive = newStatus === 'ACTIVE';

        await db.update(users)
            .set({
                status: newStatus,
                isActive: newIsActive
            })
            .where(eq(users.id, userId));

        revalidatePath("/dashboard/settings");
        return { success: true, newStatus };
    } catch (error) {
        console.error("Toggle Status Error:", error);
        return { error: "Failed to update user status" };
    }
}

export async function adminResetPassword(userId: string, newPassword: string) {
    try {
        await checkSuperAdmin();

        const passwordHash = await bcrypt.hash(newPassword, 10);

        await db.update(users)
            .set({ passwordHash })
            .where(eq(users.id, userId));

        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error) {
        console.error("Reset Password Error:", error);
        return { error: "Failed to reset password" };
    }
}

// ... existing code ...

export async function createSubscriber(data: {
    organizationName: string;
    fullName: string;
    username: string;
    email?: string;
    password: string;
}) {
    try {
        await checkSuperAdmin();

        // 1. Create Tenant
        const [tenant] = await db.insert(tenants).values({
            name: data.organizationName,
            email: data.email,
            subscriptionPlan: 'standard', // default plan
        }).returning();

        // 2. Hash Password
        const passwordHash = await bcrypt.hash(data.password, 10);

        // 3. Create User linked to Tenant
        await db.insert(users).values({
            tenantId: tenant.id,
            fullName: data.fullName,
            username: data.username,
            email: data.email,
            passwordHash,
            role: 'admin', // Default to admin for the subscriber
            status: 'ACTIVE',
            isActive: true
        });

        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error: any) {
        console.error("Create Subscriber Error:", error);
        if (error.code === '23505') { // Postgres unique violation code
            return { error: "اسم المستخدم مسجل بالفعل" };
        }
        return { error: "فشل إنشاء المشترك" };
    }
}

export async function deleteSubscriber(userId: string) {
    try {
        await checkSuperAdmin();

        // 1. Find User's Tenant
        const [user] = await db.select().from(users).where(eq(users.id, userId));

        if (!user) return { error: "المستخدم غير موجود" };

        // 2. Delete Tenant (Cascades to User and all Data)
        // Check if it's the main system tenant to avoid accidents? 
        // For now, assuming Super Admin knows what they are doing.
        // Maybe checking if it is the CURRENT user's tenant to prevent self-lockout?
        const session = await getSession();
        if (session?.userId === userId) {
            return { error: "لا يمكن حذف الحساب الحالي" };
        }

        await db.delete(tenants).where(eq(tenants.id, user.tenantId));

        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error) {
        console.error("Delete Subscriber Error:", error);
        return { error: "فشل حذف المشترك" };
    }
}

export async function getAllUsers() {
    try {
        await checkSuperAdmin();
        // Join with tenants to get organization name
        return await db.select({
            id: users.id,
            fullName: users.fullName,
            username: users.username,
            email: users.email,
            role: users.role,
            status: users.status,
            isActive: users.isActive,
            createdAt: users.createdAt,
            organizationName: tenants.name
        })
            .from(users)
            .leftJoin(tenants, eq(users.tenantId, tenants.id))
            .orderBy(desc(users.createdAt));
    } catch (error) {
        return [];
    }
}

export async function updateTenant(tenantId: string, data: {
    name: string;
    email: string;
    phone: string;
    activityType: string;
    subscriptionStartDate?: Date | null;
    nextRenewalDate?: Date | null;
    customerRating?: 'VIP' | 'Normal' | 'Difficult';
    adminNotes?: string;
}) {
    try {
        await checkSuperAdmin();

        await db.update(tenants)
            .set({
                name: data.name,
                email: data.email,
                phone: data.phone,
                activityType: data.activityType,
                subscriptionStartDate: data.subscriptionStartDate,
                nextRenewalDate: data.nextRenewalDate,
                customerRating: data.customerRating,
                adminNotes: data.adminNotes,
                updatedAt: new Date(),
            })
            .where(eq(tenants.id, tenantId));

        revalidatePath('/dashboard/settings/subscribers');
        return { success: true };
    } catch (e) {
        console.error("Failed to update tenant:", e);
        return { error: "Failed to update tenant" };
    }
}

// Restoration of factoryReset for backward compatibility and global admin use
export async function factoryReset() {
    try {
        const session = await checkAdmin();
        // Get the current user's tenant ID from the session
        let tenantId = session.tenantId;

        if (!tenantId) {
            const [user] = await db.select().from(users).where(eq(users.id, session.userId));
            tenantId = user?.tenantId;
        }

        if (!tenantId) {
            return { error: "Could not identify tenant for reset." };
        }

        // Call the safe, scoped reset
        return await resetSubscriberData(tenantId);
    } catch (error) {
        console.error("Factory Reset Error:", error);
        return { error: "Failed to perform factory reset" };
    }
}
