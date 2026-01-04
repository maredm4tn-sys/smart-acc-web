import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/features/auth/actions";
import { getActiveTenantId } from "@/lib/actions-utils";

export async function getProducts() {
    const session = await getSession();
    // This logic ensures Cashiers (who have session.tenantId pointing to Admin) see Admin's products.
    const tenantId = session?.tenantId || await getActiveTenantId();

    try {
        const rows = await db.select().from(products).where(eq(products.tenantId, tenantId));
        return rows;
    } catch (e) {
        console.error("Failed to fetch products", e);
        return [];
    }
}
