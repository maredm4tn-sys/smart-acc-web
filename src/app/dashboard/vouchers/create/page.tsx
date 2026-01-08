
import { getDictionary } from "@/lib/i18n-server";
import { VoucherForm } from "@/features/vouchers/components/voucher-form";
import { getCustomers } from "@/features/customers/actions";
import { getSuppliers } from "@/features/suppliers/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";

export const dynamic = 'force-dynamic';

export default async function CreateVoucherPage() {
    const dict = await getDictionary();
    const customers = await getCustomers();
    const suppliers = await getSuppliers();

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{dict.Vouchers.Title}</h1>
                    <p className="text-muted-foreground">{dict.Vouchers.NewReceipt} / {dict.Vouchers.NewPayment}</p>
                </div>
                <Link href="/dashboard/vouchers">
                    <Button variant="outline">
                        {dict.Common.Back}
                    </Button>
                </Link>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <VoucherForm customers={customers} suppliers={suppliers} />
            </div>
            <Toaster />
        </div>
    );
}
