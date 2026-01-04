import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { getSession } from "@/features/auth/actions";
import { redirect } from "next/navigation";
import { getDictionary } from "@/lib/i18n-server";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();
    if (!session) redirect("/login");
    const dict = await getDictionary();

    return (
        <div className="min-h-screen bg-gray-50/50 flex font-sans">
            <AppSidebar user={session} dict={dict} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header (Mobile / Breadcrumbs) */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 flex items-center justify-between sticky top-0 z-10 filter">
                    <div className="flex items-center gap-2 text-gray-500">
                        <span className="text-sm">{dict.Sidebar.Dashboard}</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-sm font-semibold text-gray-900">{dict.General.Overview}</span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Add User/Notif Menu here maybe */}
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-4 md:p-8 pb-20 md:pb-8">
                    {children}
                </main>
            </div>
            <MobileNav user={session} />
        </div>
    );
}
