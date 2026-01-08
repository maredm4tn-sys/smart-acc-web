import { PurchasesTable } from "@/features/purchases/components/purchases-table";
import { getPurchaseInvoices } from "@/features/purchases/actions";

export const dynamic = 'force-dynamic';

export default async function PurchasesPage() {
    const invoices = await getPurchaseInvoices();
    return <PurchasesTable initialInvoices={invoices} />;
}
