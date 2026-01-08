"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, CreditCard, DollarSign, Users, Package, TrendingUp, AlertTriangle, Calendar, Plus, FileText, ShoppingCart, Wallet, Truck } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/components/providers/i18n-provider";
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import { getDashboardStats } from "@/features/dashboard/actions";


interface DashboardStats {
    role: 'admin' | 'cashier' | string;
    data: any;
}

interface UserSession {
    fullName?: string;
    role: string;
}

export function DashboardView({ initialData, session }: { initialData: DashboardStats, session: UserSession }) {
    const { dict, lang } = useTranslation();
    const localeForDate = lang === 'ar' ? 'ar-EG' : 'en-US';

    // Use SWR to fetch updates. Pass initialData to render immediately.
    const { data: statsData } = useSWR('dashboard-stats', getDashboardStats, {
        fallbackData: initialData,
        refreshInterval: 30000, // Auto refresh every 30s
    });

    const role = statsData?.role || session.role || 'cashier';
    const data = statsData?.data || {};

    // --- CASHIER VIEW ---
    if (role === 'cashier') {
        const cashierStats: any = data;
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                            <span>👋</span>
                            <span>{dict.Dashboard.Welcome}، {session?.fullName || dict.Dashboard.Cashier}</span>
                        </h2>
                        <p className="text-slate-500 mt-1">{dict.Dashboard.POSReady}</p>
                    </div>
                </div>

                {/* Cashier Specific Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Link href="/dashboard/sales/create" className="group">
                        <div className="flex flex-col items-center justify-center gap-6 p-12 rounded-3xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all duration-300 cursor-pointer transform hover:-translate-y-1 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 h-40 w-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                            <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Plus className="h-10 w-10 text-white" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-2xl font-bold mb-1">{dict.Dashboard.NewInvoice}</h3>
                                <p className="text-blue-100/80 text-sm">{dict.Dashboard.NewInvoiceDesc}</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/dashboard/customers" className="group">
                        <div className="flex flex-col items-center justify-center gap-6 p-12 rounded-3xl bg-white border border-gray-100 shadow-xl shadow-gray-100 hover:shadow-2xl hover:shadow-gray-200 transition-all duration-300 cursor-pointer transform hover:-translate-y-1">
                            <div className="h-20 w-20 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Users className="h-10 w-10 text-emerald-600" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-gray-800 mb-1">{dict.Dashboard.AddCustomer}</h3>
                                <p className="text-gray-400 text-sm">{dict.Dashboard.AddCustomerDesc}</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* My Sales Stats */}
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="border-b border-gray-50 bg-gradient-to-l from-gray-50/50">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ShoppingCart className="h-5 w-5 text-blue-600" />
                            {dict.Dashboard.MySalesToday}
                        </CardTitle>
                        <CardDescription>
                            {dict.Dashboard.MyPerformance}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="grid grid-cols-2 gap-8 divide-x divide-x-reverse">
                            <div className="text-center space-y-2">
                                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{dict.Dashboard.InvoicesCount}</p>
                                <p className="text-4xl font-bold text-gray-900">{cashierStats.todayCount}</p>
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{dict.Dashboard.TotalSales}</p>
                                <p className="text-4xl font-bold text-emerald-600 dir-ltr">{Number(cashierStats.todayTotal).toLocaleString()} EGP</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // --- ADMIN VIEW ---
    const stats: any = data;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <span>👋</span>
                        <span>{dict.Dashboard.Welcome}، {session?.fullName || dict.Dashboard.SystemAdmin}</span>
                    </h2>
                    <p className="text-slate-500 mt-1">{dict.Dashboard.SummaryText}</p>
                </div>
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border shadow-sm text-sm text-slate-600 font-medium">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span>{new Date().toLocaleDateString(localeForDate, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Africa/Cairo' })}</span>
                    </div>
                    <span className="text-sm text-slate-500 font-bold font-mono mt-2 tracking-wider">
                        {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Cairo' })}
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {/* Revenue Card */}
                <CardWrapper icon={<DollarSign className="h-5 w-5" />} color="blue" title={dict.Dashboard.TotalRevenue} value={Number(stats.totalRevenue).toLocaleString()} suffix="EGP" trend="+12.5%" trendText={dict.Dashboard.CompareLastMonth} />

                {/* Receivables Card (New) */}
                <CardWrapper icon={<Wallet className="h-5 w-5" />} color="emerald" title={dict.Dashboard.Receivables} value={Number(stats.totalReceivables).toLocaleString()} suffix="EGP" pill={dict.Dashboard.Due} />

                {/* Invoices Card */}
                <CardWrapper icon={<CreditCard className="h-5 w-5" />} color="purple" title={dict.Dashboard.SalesInvoices} value={stats.invoicesCount} suffix={dict.Dashboard.Invoice} trend="+2" />

                {/* Products Card */}
                <CardWrapper icon={<Package className="h-5 w-5" />} color="orange" title={dict.Dashboard.ActiveProducts} value={stats.activeProducts} suffix={dict.Dashboard.Item} pill={dict.Dashboard.Active} />

                {/* Accounts Card */}
                <CardWrapper icon={<Activity className="h-5 w-5" />} color="emerald" title={dict.Dashboard.FinancialAccounts} value={stats.totalAccounts} suffix={dict.Dashboard.Account} />
            </div>

            {/* Charts & Actions */}
            <div className="grid gap-6 md:grid-cols-7">
                <AnalyticsCharts />

                <div className="col-span-3 flex flex-col gap-6">
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="border-b border-gray-50 pb-4">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                                {dict.Dashboard.QuickActions}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 grid grid-cols-2 gap-4">
                            <Link href="/dashboard/sales/create" className="group">
                                <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-dashed border-gray-200 hover:border-blue-500/50 hover:bg-blue-50/50 transition-all duration-300 cursor-pointer">
                                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                        <Plus className="h-6 w-6" />
                                    </div>
                                    <span className="font-medium text-sm text-slate-700">{dict.Dashboard.NewInvoice}</span>
                                </div>
                            </Link>

                            <Link href="/dashboard/journal/new" className="group">
                                <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-dashed border-gray-200 hover:border-purple-500/50 hover:bg-purple-50/50 transition-all duration-300 cursor-pointer">
                                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <span className="font-medium text-sm text-slate-700">{dict.Sidebar.JournalEntries}</span>
                                </div>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white overflow-hidden flex-1">
                        <CardHeader className="pb-2 border-b bg-slate-50/50">
                            <CardTitle className="flex items-center gap-2 text-base text-slate-900 font-black">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                {dict.Dashboard.SystemAlerts}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-4 space-y-6">
                            {/* Low Stock Alerts */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Package size={14} /> {dict.Dashboard.InventoryRequirements}
                                </h4>
                                {stats.lowStockItems && stats.lowStockItems.length > 0 ? (
                                    stats.lowStockItems.map((item: any) => (
                                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100 group transition-all hover:bg-amber-100">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900">{item.name}</span>
                                                <span className="text-[10px] text-amber-700 font-bold uppercase tracking-tighter">
                                                    {dict.Dashboard.LowStockAlert}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-black text-red-600 font-mono">{item.quantity}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-xs text-center text-gray-400 py-2 italic border border-dashed rounded-lg">
                                        {dict.Dashboard.NoLowStock}
                                    </div>
                                )}
                            </div>

                            {/* Overdue Customer Invoices */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Users size={14} /> {dict.Dashboard.CustomerReceivables}
                                </h4>
                                {stats.overdueInvoices && stats.overdueInvoices.length > 0 ? (
                                    stats.overdueInvoices.map((inv: any) => (
                                        <Link key={inv.id} href={`/dashboard/sales`} className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-100 group transition-all hover:bg-rose-100 block">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900">{inv.customer}</span>
                                                <span className="text-[10px] text-rose-700 font-bold uppercase tracking-tighter">
                                                    {dict.Dashboard.OverdueAlert}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-black text-rose-600 font-mono">{Number(inv.amount).toLocaleString()}</span>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="text-xs text-center text-gray-400 py-2 italic border border-dashed rounded-lg">
                                        {dict.Dashboard.NoOverdueSales}
                                    </div>
                                )}
                            </div>

                            {/* Due Supplier Payments */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Truck size={14} /> {dict.Dashboard.SupplierPayables}
                                </h4>
                                {stats.duePurchases && stats.duePurchases.length > 0 ? (
                                    stats.duePurchases.map((inv: any) => (
                                        <Link key={inv.id} href={`/dashboard/purchases`} className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100 group transition-all hover:bg-blue-100 block">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900">{inv.supplier}</span>
                                                <span className="text-[10px] text-blue-700 font-bold uppercase tracking-tighter">
                                                    {dict.Dashboard.SupplierDueAlert}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-black text-blue-600 font-mono">{Number(inv.amount).toLocaleString()}</span>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="text-xs text-center text-gray-400 py-2 italic border border-dashed rounded-lg">
                                        {dict.Dashboard.NoDuePurchases}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// Reusable Card Component for Grid
interface CardWrapperProps {
    icon: React.ReactNode;
    color: 'blue' | 'purple' | 'orange' | 'emerald';
    title: string;
    value: string | number;
    suffix?: string;
    trend?: string;
    trendText?: string;
    pill?: string;
}

function CardWrapper({ icon, color, title, value, suffix, trend, trendText, pill }: CardWrapperProps) {
    const bgColors: Record<string, string> = { blue: 'bg-blue-50', purple: 'bg-purple-50', orange: 'bg-orange-50', emerald: 'bg-emerald-50' };
    const textColors: Record<string, string> = { blue: 'text-blue-600', purple: 'text-purple-600', orange: 'text-orange-600', emerald: 'text-emerald-600' };

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between">
                <div className={`h-10 w-10 rounded-xl ${bgColors[color]} flex items-center justify-center ${textColors[color]} group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                </div>
                {trend && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <TrendingUp className="h-3 w-3" />
                        {trend}
                    </span>
                )}
                {pill && (
                    <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                        {pill}
                    </span>
                )}
            </div>
            <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight text-slate-900">{value}</span>
                <span className="text-sm font-medium text-slate-400">{suffix}</span>
            </div>
            {trendText && (
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-600">
                    <span className="text-slate-400">{trendText}</span>
                </div>
            )}
            {!trendText && <div className="mt-4"></div>}
        </div>
    );
}
