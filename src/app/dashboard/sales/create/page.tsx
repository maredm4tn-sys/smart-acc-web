import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/features/sales/components/invoice-form";
import { db } from "@/db";
import { products } from "@/db/schema";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n-server";


import { getCustomers } from "@/features/customers/actions";

export const dynamic = 'force-dynamic';

export default async function CreateInvoicePage() {
    const dict = await getDictionary();

    let productsList = [];
    let customersList = [];

    try {
        productsList = await db.select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            price: products.sellPrice
        }).from(products);

        // Convert decimal price string to number for the form
        productsList = productsList.map(p => ({
            ...p,
            price: Number(p.price)
        }));

        customersList = await getCustomers();

    } catch (e) {
        console.warn("DB not ready");
        // Mock data
        productsList = [
            { id: 1, sku: "HP-LAP-001", name: "HP EliteBook 840 G5", price: 12500 },
            { id: 2, sku: "DELL-LAP-002", name: "Dell Latitude 5490", price: 11000 },
            { id: 3, sku: "SRV-INST-01", name: "تسطيب ويندوز وبرامج", price: 150 },
        ];
        customersList = [
            { id: 1, name: "عميل نقدي", tenantId: "", createdAt: null, email: null, phone: null, address: null, taxId: null }
        ];
    }

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
                <InvoiceForm products={productsList} customers={customersList} />
            </div>

            <Toaster />
        </div>
    );
}
