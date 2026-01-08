import { Button } from "@/components/ui/button";
import { PurchaseForm } from "@/features/purchases/components/purchase-form";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n-server";
import { getSuppliers } from "@/features/suppliers/actions";
import { getProducts } from "@/features/inventory/queries";

export const dynamic = 'force-dynamic';

export default async function CreatePurchasePage({ searchParams }: { searchParams: Promise<{ productId?: string }> }) {
    const dict = await getDictionary();
    const resolvedParams = await searchParams;
    const productId = resolvedParams?.productId;

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
                    <h1 className="text-2xl font-bold tracking-tight">{dict.Purchases.NewInvoice}</h1>
                    <p className="text-muted-foreground">{dict.Purchases.Description}</p>
                </div>
                <Link href="/dashboard/purchases">
                    <Button variant="outline">
                        {dict.Sales?.Invoice?.BackToList || "Back"}
                    </Button>
                </Link>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm container-desktop">
                <PurchaseForm products={productsList} suppliers={suppliers} initialProductId={productId} />
            </div>
            <Toaster />
        </div>
    );
}
