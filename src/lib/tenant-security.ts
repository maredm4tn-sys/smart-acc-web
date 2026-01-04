import { getSession } from "@/features/auth/actions";
import { redirect } from "next/navigation";

/**
 * STRICTLY resolves the current authenticated Tenant ID.
 * Throws a redirection to login if no session exists.
 * Throws an error if the session has no tenant (integrity violation).
 * 
 * Usage:
 * const tenantId = await requireTenant();
 * await db.select().from(table).where(eq(table.tenantId, tenantId));
 */
export async function requireTenant(): Promise<string> {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    if (!session.tenantId) {
        console.error("Security Alert: User has session but no Tenant ID", session.userId);
        throw new Error("Tenant Context Missing");
    }

    return session.tenantId;
}

/**
 * Resolves the Tenant ID for internal server actions that MIGHT be system level,
 * but defaults to strict session check for normal users.
 */
export async function getSafeTenantId(overrideId?: string): Promise<string> {
    const session = await getSession();

    // If super admin and override provided, allow it (Future Proofing)
    // For now, STRICTLY return session tenant.

    if (!session?.tenantId) {
        throw new Error("Unauthorized Access");
    }

    return session.tenantId;
}
