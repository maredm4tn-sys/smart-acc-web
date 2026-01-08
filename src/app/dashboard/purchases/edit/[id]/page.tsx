import { Button } from "@/components/ui/button";
import { PurchaseForm } from "@/features/purchases/components/purchase-form";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n-server";
import { getSuppliers } from "@/features/suppliers/actions";
import { getProducts } from "@/features/inventory/queries";
import { getPurchaseInvoiceById } from "@/features/purchases/actions";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function EditPurchasePage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const dict = await getDictionary();
    const id = parseInt(params.id);

    console.log("DEBUG: Editing invoice ID:", id);

    const invoice = await getPurchaseInvoiceById(id);

    if (!invoice) {
        console.log("DEBUG: Invoice not found for ID:", id);
        return (
            <div className="p-8 text-center">
                <h1 className="text-xl font-bold">عفواً، لم يتم العثور على الفاتورة (ID: {id})</h1>
                <Link href="/dashboard/purchases" className="text-blue-500 underline mt-4 block">العودة للقائمة</Link>
            </div>
        );
    }

    const rawProducts = await getProducts();
    const productsList = rawProducts.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        buyPrice: Number(p.buyPrice)
    }));

    const suppliers = await getSuppliers();

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">تعديل فاتورة مشتريات</h1>
                    <p className="text-muted-foreground">{invoice.invoiceNumber}</p>
                </div>
                <Link href="/dashboard/purchases">
                    <Button variant="outline">
                        {dict.Sales?.Invoice?.BackToList || "العودة للقائمة"}
                    </Button>
                </Link>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm container-desktop">
                <PurchaseForm
                    products={productsList}
                    suppliers={suppliers}
                    initialData={invoice}
                />
            </div>
            <Toaster />
        </div>
    );
}
