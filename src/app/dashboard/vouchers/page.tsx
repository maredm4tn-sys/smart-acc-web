
import { getDictionary } from "@/lib/i18n-server";
import { getVouchers } from "@/features/vouchers/actions";
import { VouchersTable } from "@/features/vouchers/components/vouchers-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function VouchersPage() {
    const dict = await getDictionary();
    const vouchers = await getVouchers();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{dict.Vouchers.Title}</h1>
                    <p className="text-sm md:text-base text-muted-foreground">
                        {dict.Sidebar.FinancialOperations}
                    </p>
                </div>
                <div className="w-full sm:w-auto">
                    <Link href="/dashboard/vouchers/create">
                        <Button className="w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" />
                            {dict.Common.CreateNew || "إضافة جديد"}
                        </Button>
                    </Link>
                </div>
            </div>


            <VouchersTable vouchers={vouchers} />
        </div>
    );
}
