"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Dictionary } from "@/lib/i18n-server";
import { LayoutDashboard, FileText, Settings, ShoppingCart, Users, FolderTree, Package, PlusCircle, LogOut, Wallet, Truck, ShoppingBag, Receipt, X, CalendarClock, Briefcase } from "lucide-react";
import { logout } from "@/features/auth/actions";
import { LanguageSwitcher } from "@/components/language-switcher";

// Helper for conditional classes
function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}

// Sidebar Item Component
function SidebarItem({ href, icon, label, onClick }: { href: string, icon: React.ReactNode, label: string, onClick?: () => void }) {
    const pathname = usePathname();
    const isActive = href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname?.startsWith(href);

    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group text-sm font-medium border-r-4",
                isActive
                    ? "bg-blue-50 border-blue-600 text-blue-700 font-bold"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
        >
            <span className={cn("transition-colors duration-200", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")}>{icon}</span>
            <span>{label}</span>
        </Link>
    )
}

interface User {
    userId: string;
    username: string;
    role: 'admin' | 'cashier' | 'SUPER_ADMIN' | 'CLIENT';
    fullName: string;
}

export function AppSidebar({ user, dict, onClose }: { user?: User, dict: Dictionary, onClose?: () => void }) {
    const isAdmin = user?.role === 'admin' || user?.role === 'SUPER_ADMIN';
    const isCashier = user?.role === 'cashier';

    return (
        <aside className="w-72 h-full bg-white text-slate-800 border-l border-gray-200 shadow-sm flex flex-col z-20">
            <div className="h-20 flex items-center px-6 border-b border-gray-100 justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12">
                        <Image
                            src="/logo.png"
                            alt="Smart Acc Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <div>
                        <h1 className="text-base font-bold tracking-tight text-slate-900">{dict?.Logo || "Smart Acc"}</h1>
                        <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Smart Acc v2.0</p>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="lg:hidden p-2 text-slate-400 hover:text-slate-600 transition-colors"
                        title={dict?.Common?.Close || "Close"}
                        aria-label={dict?.Common?.Close || "Close"}
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            <nav className="flex-1 p-4 space-y-1 mt-4 overflow-y-auto custom-scrollbar">

                {/* Admin Menu */}
                {isAdmin && (
                    <>
                        <p className="px-4 text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-wider">{dict?.Sidebar?.MainMenu || "Main Menu"}</p>
                        <SidebarItem href="/dashboard" icon={<LayoutDashboard size={20} />} label={dict?.Sidebar?.Dashboard || "Dashboard"} onClick={onClose} />
                        <SidebarItem href="/dashboard/vouchers" icon={<Receipt size={20} />} label={dict?.Vouchers?.Title || "Receipts & Payments"} onClick={onClose} />
                        <SidebarItem href="/dashboard/accounts" icon={<FolderTree size={20} />} label={dict?.Sidebar?.ChartOfAccounts || "Accounts"} onClick={onClose} />
                        <SidebarItem href="/dashboard/inventory" icon={<Package size={20} />} label={dict?.Sidebar?.Inventory || "Inventory"} onClick={onClose} />
                        <SidebarItem href="/dashboard/suppliers" icon={<Truck size={20} />} label={dict?.Sidebar?.Suppliers || "Suppliers"} onClick={onClose} />
                        <SidebarItem href="/dashboard/customers" icon={<Users size={20} />} label={dict?.Sidebar?.Customers || "Customers"} onClick={onClose} />
                        <SidebarItem href="/dashboard/employees" icon={<Users size={20} />} label={dict?.Employees?.Title || "Employees"} onClick={onClose} />
                        <SidebarItem href="/dashboard/representatives" icon={<Briefcase size={20} />} label={dict?.Representatives?.MenuLabel || "Representatives"} onClick={onClose} />

                        <div className="my-6 border-t border-gray-100 mx-4"></div>

                        <p className="px-4 text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-wider">{dict?.Sidebar?.FinancialOperations || "Finance"}</p>
                        <SidebarItem href="/dashboard/pos" icon={<LayoutDashboard size={20} />} label={dict?.Sidebar?.POS || "POS"} onClick={onClose} />
                        <SidebarItem href="/dashboard/journal" icon={<FileText size={20} />} label={dict?.Sidebar?.JournalEntries || "Journal"} onClick={onClose} />
                        <SidebarItem href="/dashboard/expenses" icon={<Wallet size={20} />} label={dict?.Sidebar?.Expenses || "Expenses"} onClick={onClose} />

                        <SidebarItem href="/dashboard/purchases" icon={<ShoppingBag size={20} />} label={dict?.Purchases?.Title || "Purchases"} onClick={onClose} />
                        <SidebarItem href="/dashboard/sales" icon={<ShoppingCart size={20} />} label={dict?.Sidebar?.SalesAndInvoices || "Sales"} onClick={onClose} />
                        <SidebarItem href="/dashboard/installments" icon={<CalendarClock size={20} />} label={dict?.Installments?.Title || "Installments"} onClick={onClose} />

                        <div className="my-6 border-t border-gray-100 mx-4"></div>

                        <p className="px-4 text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-wider">{dict?.Sidebar?.Reports || "Reports"}</p>
                        <SidebarItem href="/dashboard/reports" icon={<FileText size={20} />} label={dict?.Sidebar?.Reports || "Reports"} onClick={onClose} />

                        <div className="my-6 border-t border-gray-100 mx-4"></div>

                        <p className="px-4 text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-wider">{dict?.Sidebar?.Management || "Management"}</p>
                        <SidebarItem href="/dashboard/users" icon={<Users size={20} />} label={dict?.Sidebar?.Users || "Users"} onClick={onClose} />
                        <SidebarItem href="/dashboard/settings" icon={<Settings size={20} />} label={dict?.Sidebar?.Settings || "Settings"} onClick={onClose} />
                    </>
                )}

                {/* Cashier Menu */}
                {isCashier && (
                    <>
                        <p className="px-4 text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-wider">{dict?.Sidebar?.POS || "POS"}</p>
                        <SidebarItem href="/dashboard/pos" icon={<LayoutDashboard size={20} />} label={dict?.Sidebar?.POS || "POS"} onClick={onClose} />
                        <SidebarItem href="/dashboard/sales/create" icon={<PlusCircle size={20} />} label={dict?.Sidebar?.NewInvoice || "New Invoice"} onClick={onClose} />
                        <SidebarItem href="/dashboard/sales" icon={<ShoppingCart size={20} />} label={dict?.Sidebar?.InvoicesList || "Invoices"} onClick={onClose} />
                        <SidebarItem href="/dashboard/customers" icon={<Users size={20} />} label={dict?.Sidebar?.Customers || "Customers"} onClick={onClose} />
                    </>
                )}

            </nav>
            <div className="px-4 mb-2">
                <LanguageSwitcher />
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <div className="bg-white p-3 rounded-xl flex items-center justify-between border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                            {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-900 truncate">{user?.fullName || 'User'}</p>
                            <p className="text-xs text-slate-500 truncate capitalize">
                                {user?.role === 'SUPER_ADMIN' || user?.role === 'admin'
                                    ? (dict?.Dashboard?.SystemAdmin || "System Admin")
                                    : (dict?.Dashboard?.Cashier || "Cashier")}
                            </p>
                        </div>
                    </div>
                    <form action={logout}>
                        <button type="submit" className="text-slate-400 hover:text-red-500 transition-colors p-1" title={dict?.Sidebar?.Logout || "Logout"}>
                            <LogOut size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </aside>
    );
}
