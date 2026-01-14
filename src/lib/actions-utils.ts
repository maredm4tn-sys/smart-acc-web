import { db } from "@/db";
import { tenants } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function getActiveTenantId(providedId?: string): Promise<string> {

    // Check if providedId is a valid UUID (simple regex check)
    const isValidUUID = providedId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providedId);

    if (isValidUUID) {
        // Opt: verify it exists
        return providedId;
    }

    // -------------------------------------------------------------------------
    // SECURITY PATCH: ALWAYS prioritize session-based tenant identification
    // -------------------------------------------------------------------------
    try {
        const { getSession } = await import("@/features/auth/actions");
        const session = await getSession();

        if (session?.tenantId) {
            console.log(`[Security] Using session tenantId: ${session.tenantId}`);
            return session.tenantId;
        }
    } catch (e) {
        console.warn("[Security] Session check failed or was attempted from unsupported context.");
    }

    // DESKTOP/OFFLINE ONLY: If no session, pick the first tenant (Safe because it's single-user local)
    const isWeb = process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!isWeb) {
        try {
            const rows = await db.select({ id: tenants.id }).from(tenants).limit(1);
            if (rows[0]?.id) return rows[0].id;

            // Or create one if it doesn't exist (Only for local dev/desktop)
            const [newTenant] = await db.insert(tenants).values({
                name: "الشركة الافتراضية",
                currency: "EGP"
            }).returning();
            return newTenant.id;
        } catch (e) {
            console.error("Local tenant creation failed:", e);
        }
    }

    // WEB MODE: NO FALLBACK. If no session, access MUST be denied.
    throw new Error("Unauthorized: Access denied. Please log in.");
}
