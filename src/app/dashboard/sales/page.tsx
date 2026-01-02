import { db } from "@/db";
import { invoices } from "@/db/schema";
import { desc } from "drizzle-orm";
import { InvoicesTable } from "@/components/sales/invoices-table";

export default async function SalesPage() {
    let invoicesList = [];
    try {
        invoicesList = await db.select().from(invoices).orderBy(desc(invoices.issueDate));
    } catch (e) {
        console.warn("DB not ready");
        invoicesList = [];
    }

    return <InvoicesTable initialInvoices={invoicesList} />;
}
