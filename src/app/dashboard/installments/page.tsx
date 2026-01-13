import { getDictionary } from "@/lib/i18n-server";
import { getInstallments } from "@/features/installments/actions";
import { InstallmentsClient } from "@/features/installments/components/installments-client";
import { Toaster } from "@/components/ui/sonner";

export const dynamic = 'force-dynamic';

export default async function InstallmentsPage() {
    const dict = await getDictionary();
    const installmentsData = await getInstallments();

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{(dict as any).Installments?.Title || "إدارة الأقساط"}</h1>
                    <p className="text-muted-foreground">{(dict as any).Installments?.Description || "متابعة تحصيل أقساط العملاء وجدولة المواعيد"}</p>
                </div>
            </div>

            <InstallmentsClient initialData={installmentsData} dict={dict} />

            <Toaster />
        </div>
    );
}
