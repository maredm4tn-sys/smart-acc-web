import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/features/sales/components/invoice-form";
import { db } from "@/db";
import { products } from "@/db/schema";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n-server";
import { eq } from "drizzle-orm"; // Added eq import
import { getActiveTenantId } from "@/lib/actions-utils"; // Added getActiveTenantId

import { getCustomers } from "@/features/customers/actions";

export const dynamic = 'force-dynamic';

import { getProducts } from "@/features/inventory/queries";
import { getAllRepresentatives } from "@/features/representatives/actions"; // Add this
import { getSettings } from "@/features/settings/actions";

export default async function CreateInvoicePage() {
    const dict = await getDictionary();

    const rawProducts = await getProducts();
    const productsList = rawProducts.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: Number(p.sellPrice)
    }));

    let customersList: { id: number; name: string }[] = [];
    try {
        customersList = await getCustomers();
    } catch (e) {
        customersList = [{ id: 1, name: "عميل نقدي" }];
    }

    const start = performance.now();
    const representatives = await getAllRepresentatives();
    const settings = await getSettings();
    console.log("Representatives fetch time:", performance.now() - start);

    const representativesList = representatives.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type
    }));

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{dict.Sales.Invoice.NewTitle}</h1>
                    <p className="text-muted-foreground">{dict.Sales.Invoice.NewDescription}</p>
                </div>
                <Link href="/dashboard/sales">
                    <Button variant="outline">
                        {dict.Sales.Invoice.BackToList}
                    </Button>
                </Link>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <InvoiceForm
                    products={productsList}
                    customers={customersList}
                    representatives={representativesList}
                    settings={settings}
                />
            </div>

            <Toaster />
        </div>
    );
}
