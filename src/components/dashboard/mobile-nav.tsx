"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, FileText, PlusCircle, ShoppingBag, Receipt } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";


interface User {
    role: 'admin' | 'cashier' | 'SUPER_ADMIN' | 'CLIENT';
}

export function MobileNav({ user }: { user?: User }) {
    const pathname = usePathname();
    const { dict } = useTranslation();
    const isAdmin = user?.role === 'admin' || user?.role === 'SUPER_ADMIN';

    const isActive = (href: string) => pathname === href || pathname?.startsWith(href);

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-50 flex items-center justify-around px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-[env(safe-area-inset-bottom)]">
            <Link href="/dashboard" className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${pathname === '/dashboard' ? 'text-blue-600' : 'text-gray-400'}`}>
                <LayoutDashboard size={24} strokeWidth={pathname === '/dashboard' ? 2.5 : 2} />
                <span className="text-[10px] font-medium mt-1">{dict.Sidebar.Dashboard}</span>
            </Link>

            <Link href="/dashboard/sales" className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${isActive('/dashboard/sales') && pathname !== '/dashboard/sales/create' ? 'text-blue-600' : 'text-gray-400'}`}>
                <ShoppingCart size={24} strokeWidth={isActive('/dashboard/sales') && pathname !== '/dashboard/sales/create' ? 2.5 : 2} />
                <span className="text-[10px] font-medium mt-1">{dict.Sidebar.SalesAndInvoices}</span>
            </Link>

            <div className="-mt-8">
                <Link href="/dashboard/sales/create" className="flex items-center justify-center h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200 active:scale-95 transition-transform">
                    <PlusCircle size={28} />
                </Link>
            </div>

            {isAdmin && (
                <>
                    <Link href="/dashboard/vouchers" className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${isActive('/dashboard/vouchers') ? 'text-blue-600' : 'text-gray-400'}`}>
                        <Receipt size={24} strokeWidth={isActive('/dashboard/vouchers') ? 2.5 : 2} />
                        <span className="text-[10px] font-medium mt-1">{(dict as any).Vouchers?.Title || "Vouchers"}</span>
                    </Link>
                    <Link href="/dashboard/purchases" className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${isActive('/dashboard/purchases') ? 'text-blue-600' : 'text-gray-400'}`}>
                        <ShoppingBag size={24} strokeWidth={isActive('/dashboard/purchases') ? 2.5 : 2} />
                        <span className="text-[10px] font-medium mt-1">{(dict as any).Purchases?.Title || "Purchases"}</span>
                    </Link>
                    <Link href="/dashboard/reports/income-statement" className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${isActive('/dashboard/reports') ? 'text-blue-600' : 'text-gray-400'}`}>
                        <FileText size={24} strokeWidth={isActive('/dashboard/reports') ? 2.5 : 2} />
                        <span className="text-[10px] font-medium mt-1">{dict.Sidebar.Reports}</span>
                    </Link>
                </>
            )}
        </div>
    );
}
