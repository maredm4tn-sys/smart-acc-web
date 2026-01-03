"use server";

import { db } from "@/db";
import { users, invoices, products, customers, journalEntries, accounts, auditLogs, tenants } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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

export async function factoryReset() {
    try {
        await checkSuperAdmin();

        // Delete data in order of dependencies (though cascading might handle some)
        // Deleting transactions and operational data
        await db.delete(invoices); // Cascades to invoiceItems
        await db.delete(products);
        await db.delete(customers);
        await db.delete(journalEntries); // Cascades to journalLines
        // Note: accounts often have hierarchy. Deleting them might be risky if not resetting everything. 
        // Requirement said "invoices, products, customers, transactions". 
        // Accounts are structural, maybe keep them? 
        // "Factory Reset" usually implies wiping operational data.
        // I will stick to the requested list: invoices, products, customers, transactions.

        // Also add audit log
        const session = await checkSuperAdmin();
        await db.insert(auditLogs).values({
            tenantId: (await db.select().from(users).where(eq(users.id, session.userId))).map(u => u.tenantId)[0],
            userId: session.userId,
            action: "FACTORY_RESET",
            entity: "SYSTEM",
            entityId: "ALL",
            details: "Full factory reset performed",
            createdAt: new Date(),
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Factory Reset Error:", error);
        return { error: "Failed to perform factory reset" };
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
