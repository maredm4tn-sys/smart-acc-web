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

    try {
        // 1. Try to find the first existing tenant using standard Drizzle select
        // compatible with both SQLite and Postgres
        const rows = await db.select({ id: tenants.id }).from(tenants).limit(1);
        const row = rows[0];

        if (row && row.id) {
            return row.id;
        }

        // 2. If no tenant exists, create one
        console.log("No tenant found. Creating default tenant...");
        const [newTenant] = await db.insert(tenants).values({
            name: "الشركة الافتراضية",
            subscriptionPlan: "free",
            currency: "EGP"
        }).returning();

        console.log("Created default tenant:", newTenant.id);
        return newTenant.id;
    } catch (error) {
        console.error("CRITICAL ERROR in getActiveTenantId:", error);
        // Fallback: If DB is completely locked/broken, we can't return a valid ID.
        // Rethrow with more context.
        throw new Error(`Could not determine active tenant. Details: ${error instanceof Error ? error.message : String(error)}`);
    }
}
