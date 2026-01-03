"use server";

import { db } from "@/db";
import { users, invoices, products, customers, journalEntries, accounts, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
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

export async function getAllUsers() {
    try {
        await checkSuperAdmin();
        return await db.select().from(users);
    } catch (error) {
        return [];
    }
}
