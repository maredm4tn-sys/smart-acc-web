
import { getSalesSummary } from "@/features/reports/actions";
import { getDictionary } from "@/lib/i18n-server";
import ReportsClient from "@/features/reports/components/reports-client";

export default async function ReportsPage() {
    const summary = await getSalesSummary();
    const dict = (await getDictionary()) as any;

    return (
        <div className="p-6">
            <ReportsClient initialSummary={summary} dict={dict} />
        </div>
    );
}
