import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";
import { AccountWithChildren } from "../types";
import { getSession } from "@/features/auth/actions";
import { getActiveTenantId } from "@/lib/actions-utils";

export async function getChartOfAccounts(): Promise<AccountWithChildren[]> {
    try {
        const session = await getSession();
        const tenantId = session?.tenantId || await getActiveTenantId();

        // Fetch all accounts
        // In a real large app, you might fetch top-level then fetch children on demand, 
        // but for a typical CoA, fetching all (~200 records) is fine.
        let allAccounts = [];
        try {
            allAccounts = await db.select().from(accounts).where(eq(accounts.tenantId, tenantId));
        } catch (e) {
            console.warn("Failed to fetch accounts (likely DB not init):", e);
            return [];
        }

        // Build tree
        const accountMap = new Map<number, AccountWithChildren>();
        const rootAccounts: AccountWithChildren[] = [];

        // Initialize map
        allAccounts.forEach(acc => {
            accountMap.set(acc.id, { ...acc, children: [] });
        });

        // Link children to parents
        allAccounts.forEach(acc => {
            const account = accountMap.get(acc.id)!;
            if (acc.parentId) {
                const parent = accountMap.get(acc.parentId);
                if (parent) {
                    parent.children?.push(account);
                }
            } else {
                rootAccounts.push(account);
            }
        });

        return rootAccounts;
    } catch (error) {
        console.error("Failed to fetch accounts:", error);
        return [];
    }
}
