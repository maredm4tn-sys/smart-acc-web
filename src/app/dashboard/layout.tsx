import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getSession } from "@/features/auth/actions";
import { redirect } from "next/navigation";
import { getDictionary, getLocale } from "@/lib/i18n-server";
import { ActivationDialog } from "@/features/admin/components/activation-dialog";

export const dynamic = 'force-dynamic';

import { OfflineSyncManager } from "@/components/common/offline-sync-manager";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();
    if (!session) redirect("/login");
    const dict = await getDictionary();
    const locale = await getLocale();
    const isRtl = locale === 'ar';

    return (
        <>
            <DashboardShell user={session} dict={dict} isRtl={isRtl}>
                {children}
            </DashboardShell>
            <ActivationDialog dict={dict} />
            <OfflineSyncManager />
        </>
    );
}
