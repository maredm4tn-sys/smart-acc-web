import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/features/auth/actions";
import { getActiveTenantId } from "@/lib/actions-utils";

export async function getProducts() {
    try {
        const session = await getSession();
        const tenantId = session?.tenantId || await getActiveTenantId();

        const rows = await db.select().from(products).where(eq(products.tenantId, tenantId));
        return rows;
    } catch (e) {
        console.error("Failed to fetch products", e);
        // On server, we can't access IndexedDB, so we just return empty
        // The client will handle falling back to local storage if needed
        return [];
    }
}

// Client-side reachable API endpoint for better offline sync
export async function getProductsAPI() {
    return await getProducts();
}
