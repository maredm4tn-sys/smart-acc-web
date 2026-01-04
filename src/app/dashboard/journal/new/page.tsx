import { Button } from "@/components/ui/button";
import Link from "next/link";
import { JournalEntryForm } from "@/features/accounting/components/journal-form";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { Toaster } from "@/components/ui/sonner";
import { getSession } from "@/features/auth/actions";
import { getActiveTenantId } from "@/lib/actions-utils";
import { eq } from "drizzle-orm";

export default async function NewJournalPage() {
    const session = await getSession();
    const tenantId = session?.tenantId || await getActiveTenantId();

    let accountsList = [];
    try {
        // Fetch lowest level accounts (Transactionable accounts)
        // For simplicity fetching all for now. In real app filtered by type and isLeaf.
        accountsList = await db.select({
            id: accounts.id,
            code: accounts.code,
            name: accounts.name
        }).from(accounts).where(eq(accounts.tenantId, tenantId));
    } catch (e) {
        console.warn("DB not ready");
        accountsList = [
            { id: 4, code: "1101", name: "النقدية بالخزينة" },
            { id: 5, code: "1102", name: "البنك الأهلي" },
            { id: 10, code: "2000", name: "رأس المال" },
            { id: 11, code: "4000", name: "المبيعات" },
            { id: 12, code: "5000", name: "المصروفات" }
        ];
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">قيد يومية جديد</h1>
                    <p className="text-muted-foreground">إنشاء حركة مالية يدوية في دفتر اليومية العامة.</p>
                </div>
                <Link href="/dashboard/journal">
                    <Button variant="outline">
                        العودة للقائمة
                    </Button>
                </Link>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <JournalEntryForm accounts={accountsList} />
            </div>

            <Toaster />
        </div>
    );
}
