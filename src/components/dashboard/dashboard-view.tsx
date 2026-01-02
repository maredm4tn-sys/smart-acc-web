"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, CreditCard, DollarSign, Users, Package, TrendingUp, AlertTriangle, Calendar, Plus, FileText, ShoppingCart, Wallet } from "lucide-react";
// ... (imports)

// ...

{/* Stats Grid */ }
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
    {/* Revenue Card */}
    <CardWrapper icon={<DollarSign className="h-5 w-5" />} color="blue" title={dict.Dashboard.TotalRevenue} value={Number(stats.totalRevenue).toLocaleString()} suffix="EGP" trend="+12.5%" trendText={dict.Dashboard.CompareLastMonth} />

    {/* Receivables Card (New) */}
    <CardWrapper icon={<Wallet className="h-5 w-5" />} color="emerald" title={dict?.Dashboard?.Receivables || "Account Receivables"} value={Number(stats.totalReceivables).toLocaleString()} suffix="EGP" pill="Due" />

    {/* Invoices Card */}
    <CardWrapper icon={<CreditCard className="h-5 w-5" />} color="purple" title={dict.Dashboard.SalesInvoices} value={stats.invoicesCount} suffix={dict.Dashboard.Invoice} trend="+2" />

    {/* Products Card */}
    <CardWrapper icon={<Package className="h-5 w-5" />} color="orange" title={dict.Dashboard.ActiveProducts} value={stats.activeProducts} suffix={dict.Dashboard.Item} pill={dict.Dashboard.Active} />

    {/* Accounts Card */}
    <CardWrapper icon={<Activity className="h-5 w-5" />} color="emerald" title={dict.Dashboard.FinancialAccounts} value={stats.totalAccounts} suffix={dict.Dashboard.Account} />
</div>

{/* Charts & Actions */ }
<div className="grid gap-6 md:grid-cols-7">
    <RevenueChart />

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

        <Card className="border-none shadow-sm bg-amber-50/50 border-amber-100 overflow-hidden flex-1">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-amber-900">
                    <AlertTriangle className="h-4 w-4" />
                    {dict.Dashboard.SystemAlerts}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <div className="space-y-3">
                    <div className="flex gap-3 items-start bg-white/60 p-3 rounded-lg border border-amber-100 shadow-sm">
                        <div className="h-2 w-2 mt-2 rounded-full bg-red-500 shrink-0"></div>
                        <div>
                            <h4 className="font-medium text-sm text-gray-900">{dict.Dashboard.LowStock}</h4>
                            <p className="text-xs text-gray-500 mt-1">{dict.Dashboard.LowStockAlertMock}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
</div>
        </div >
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
