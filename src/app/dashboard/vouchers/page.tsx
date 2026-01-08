
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{dict.Vouchers.Title}</h1>
                    <p className="text-muted-foreground">
                        {dict.Sidebar.FinancialOperations}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/vouchers/create">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            {(dict as any).Common?.CreateNew || "إضافة جديد +"}
                        </Button>
                    </Link>
                </div>
            </div>

            <VouchersTable vouchers={vouchers} />
        </div>
    );
}
