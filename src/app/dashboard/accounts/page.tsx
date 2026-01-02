import { AccountTree } from "@/features/accounting/components/account-tree";
import { getChartOfAccounts } from "@/features/accounting/services/accounts";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { AddAccountDialog } from "@/features/accounting/components/add-account-dialog";
import { DefaultAccountsSeed } from "@/features/accounting/components/default-accounts-seed"; // Moved here
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { Toaster } from "@/components/ui/sonner";

import { getDictionary } from "@/lib/i18n-server";

// ...
export default async function AccountsPage() {
    const dict = await getDictionary();
    const rootAccounts = await getChartOfAccounts();

    let allAccountsList: any[] = [];
    try {
        // Fetch flat list for the parent dropdown
        allAccountsList = await db.select({
            id: accounts.id,
            name: accounts.name,
            code: accounts.code
        }).from(accounts);
    } catch (e) {
        console.warn("DB Connection failed, using fallback empty list for dropdown");
        // Fallback if DB fails
        allAccountsList = [];
    }

    // Prepare preview data if rootAccounts is empty (db failed or empty)
    const previewData = rootAccounts.length > 0 ? rootAccounts : [
        {
            id: 1,
            tenantId: 'uuid',
            code: '1000',
            name: 'الأصول - Assets',
            type: 'asset',
            parentId: null,
            isActive: true,
            balance: '50000.00',
            createdAt: new Date(),
            children: [
                {
                    id: 2, tenantId: 'uuid', code: '1100', name: 'الأصول المتداولة', type: 'asset', parentId: 1, isActive: true, balance: '30000.00', createdAt: new Date(), children: [
                        { id: 4, tenantId: 'uuid', code: '1101', name: 'النقدية بالخزينة', type: 'asset', parentId: 2, isActive: true, balance: '5000.00', createdAt: new Date() },
                        { id: 5, tenantId: 'uuid', code: '1102', name: 'البنك الأهلي', type: 'asset', parentId: 2, isActive: true, balance: '25000.00', createdAt: new Date() },
                    ]
                },
                { id: 3, tenantId: 'uuid', code: '1200', name: 'الأصول الثابتة', type: 'asset', parentId: 1, isActive: true, balance: '20000.00', createdAt: new Date(), children: [] },
            ]
        },
        {
            id: 10,
            tenantId: 'uuid',
            code: '2000',
            name: 'الخصوم - Liabilities',
            type: 'liability',
            parentId: null,
            isActive: true,
            balance: '15000.00',
            createdAt: new Date(),
            children: []
        }
    ] as any[];

    // Mock data for immediate preview if DB empty (Optional: remove this if you want strict DB only)
    // Keeping mock only in Tree, but empty list for parents if none.

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{dict.Accounts.Title}</h1>
                    <p className="text-muted-foreground">{dict.Accounts.Description}</p>
                </div>
                <div className="flex gap-2">
                    <DefaultAccountsSeed tenantId="current" label={dict.Accounts.ImportDefault} />
                    {/* The Dialog Component - Pass label if possible or rely on internal translation */}
                    <AddAccountDialog parentAccounts={allAccountsList} triggerLabel={dict.Accounts.NewAccount} />
                </div>
            </div>

            <AccountTree accounts={rootAccounts.length > 0 ? rootAccounts : previewData} />
            <Toaster />
        </div>
    );
}
