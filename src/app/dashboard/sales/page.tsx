import { db } from "@/db";
import { invoices } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { InvoicesTable } from "@/components/sales/invoices-table";
import { getSession } from "@/features/auth/actions";
import { getActiveTenantId } from "@/lib/actions-utils";

export default async function SalesPage() {
    const session = await getSession();
    const tenantId = session?.tenantId || await getActiveTenantId();

    let invoicesList: typeof invoices.$inferSelect[] = [];
    try {
        invoicesList = await db.select().from(invoices)
            .where(eq(invoices.tenantId, tenantId))
            .orderBy(desc(invoices.issueDate));
    } catch (e) {
        console.warn("DB not ready");
        invoicesList = [];
    }

    return <InvoicesTable initialInvoices={invoicesList} />;
}
