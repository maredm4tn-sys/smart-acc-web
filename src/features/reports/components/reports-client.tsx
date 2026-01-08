
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    DollarSign, Calendar, TrendingUp, Users, Truck, RefreshCw,
    Package, FileText, ArrowRightLeft, PieChart, Wallet,
    ShoppingBag, Receipt, Scale, Landmark, Coins, ArrowDownRight, ArrowUpRight, ShieldCheck
} from "lucide-react";
import { syncAllPurchasesToLedger } from "@/features/purchases/sync-action";
import { toast } from "sonner";
import { getSalesSummary } from "@/features/reports/actions";
import Link from "next/link";

interface ReportsClientProps {
    initialSummary: any;
    dict: any;
}

export default function ReportsClient({ initialSummary, dict }: ReportsClientProps) {
    const [summary, setSummary] = useState(initialSummary);
    const [isSyncing, setIsSyncing] = useState(false);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EGP',
        }).format(val);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await syncAllPurchasesToLedger();
            if (res.success) {
                toast.success(res.message);
                const updatedSummary = await getSalesSummary();
                setSummary(updatedSummary);
            } else {
                toast.error(res.error);
            }
        } catch (e) {
            toast.error(dict?.Common?.Error || "An error occurred");
        } finally {
            setIsSyncing(false);
        }
    };

    // Calculate Working Capital: (Cash + Inventory + Customer Debts) - Supplier Debts
    const workingCapital = (summary?.cashBalance || 0) + (summary?.inventoryValue || 0) + (summary?.customerDebts || 0) - (summary?.supplierDebts || 0);

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="relative">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                        <PieChart className="text-blue-600 w-10 h-10" />
                        {dict?.Reports?.Title || "Reports"}
                    </h1>
                    <p className="text-slate-500 font-bold mt-2 text-lg italic">{dict?.Reports?.SubTitle}</p>
                </div>
                <Button
                    variant="default"
                    className="flex items-center gap-3 bg-slate-900 hover:bg-black text-white font-black px-8 py-7 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
                    onClick={handleSync}
                    disabled={isSyncing}
                >
                    <RefreshCw className={`w-6 h-6 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? dict?.Reports?.Syncing : dict?.Reports?.SyncButton}
                </Button>
            </div>

            {/* Section 1: Financial Health & Working Capital */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-none shadow-xl shadow-emerald-100 p-2">
                    <CardHeader className="pb-1">
                        <CardTitle className="text-xs font-black opacity-80 uppercase tracking-widest flex items-center gap-2">
                            <Scale size={16} /> {dict?.Reports?.WorkingCapital}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black tracking-tighter">{formatCurrency(workingCapital)}</div>
                        <p className="text-[10px] font-bold mt-3 text-emerald-100 uppercase tracking-widest italic leading-relaxed">
                            {dict?.Reports?.WorkingCapitalDesc}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none shadow-xl shadow-blue-100 p-2">
                    <CardHeader className="pb-1">
                        <CardTitle className="text-xs font-black opacity-80 uppercase tracking-widest flex items-center gap-2">
                            <Wallet size={16} /> {dict?.Reports?.TotalCash}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black tracking-tighter">{formatCurrency(summary?.cashBalance || 0)}</div>
                        <p className="text-[10px] font-bold mt-3 text-blue-100 uppercase tracking-widest italic">{dict?.Reports?.TotalCashDesc}</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-slate-700 to-slate-900 text-white border-none shadow-xl shadow-slate-200 p-2">
                    <CardHeader className="pb-1">
                        <CardTitle className="text-xs font-black opacity-80 uppercase tracking-widest flex items-center gap-2">
                            <Package size={16} /> {dict?.Reports?.InventoryValue}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black tracking-tighter">{formatCurrency(summary?.inventoryValue || 0)}</div>
                        <p className="text-[10px] font-bold mt-3 text-slate-300 uppercase tracking-widest italic">{dict?.Reports?.InventoryValueDesc}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Section 2: Sales Metrics */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                <Card className="bg-white border shadow-sm group hover:border-blue-200 transition-colors">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-500">{dict?.Reports?.Overview?.Today || "Today's Sales"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-900">{formatCurrency(summary?.daily?.total || 0)}</div>
                        <div className="text-xs font-bold text-blue-600 mt-1">{summary?.daily?.count || 0} {dict?.Reports?.Overview?.Invoice || "Invoice"}</div>
                    </CardContent>
                </Card>

                <Card className="bg-white border shadow-sm group hover:border-indigo-200 transition-colors">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-500">{dict?.Reports?.Overview?.Month || "Monthly Sales"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-900">{formatCurrency(summary?.monthly?.total || 0)}</div>
                        <div className="text-xs font-bold text-indigo-600 mt-1">{summary?.monthly?.count || 0} {dict?.Reports?.Overview?.Deals || "Deals"}</div>
                    </CardContent>
                </Card>

                <Card className="bg-white border shadow-sm group hover:border-emerald-200 transition-colors">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-500">{dict?.Reports?.Overview?.YearlySales || "Yearly Sales"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-900">{formatCurrency(summary?.yearly?.total || 0)}</div>
                        <div className="text-xs font-bold text-emerald-600 mt-1">{dict?.Reports?.FiscalYearTotal}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Section 3: Detailed Audit Links (Optimized Grid) */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Link href="/dashboard/reports/statement?search=customers" className="bg-slate-100 hover:bg-slate-200 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all border border-slate-200 group">
                    <Users className="mb-2 text-slate-500 group-hover:text-slate-900" />
                    <span className="text-sm font-bold text-slate-800">{dict?.Reports?.Statements?.Customers}</span>
                </Link>
                <Link href="/dashboard/reports/statement?search=suppliers" className="bg-lime-50 hover:bg-lime-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all border border-lime-200 group">
                    <Truck className="mb-2 text-lime-600 group-hover:text-lime-900" />
                    <span className="text-sm font-bold text-slate-800">{dict?.Reports?.Statements?.Suppliers}</span>
                </Link>
                <Link href="/dashboard/reports/statement?search=cash" className="bg-rose-50 hover:bg-rose-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all border border-rose-200 group">
                    <Coins className="mb-2 text-rose-600 group-hover:text-rose-900" />
                    <span className="text-sm font-bold text-slate-800">{dict?.Reports?.Statements?.Cash}</span>
                </Link>
                <Link href="/dashboard/reports/statement?search=banks" className="bg-blue-50 hover:bg-blue-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all border border-blue-200 group">
                    <Landmark className="mb-2 text-blue-600 group-hover:text-blue-900" />
                    <span className="text-sm font-bold text-slate-800">{dict?.Reports?.Statements?.Banks}</span>
                </Link>
                <Link href="/dashboard/reports/statement?search=expenses" className="bg-cyan-50 hover:bg-cyan-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all border border-cyan-200 group">
                    <Wallet className="mb-2 text-cyan-600 group-hover:text-cyan-900" />
                    <span className="text-sm font-bold text-slate-800">{dict?.Reports?.Statements?.Expenses}</span>
                </Link>
                <Link href="/dashboard/vouchers" className="bg-indigo-50 hover:bg-indigo-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all border border-indigo-200 group">
                    <ArrowDownRight className="mb-2 text-indigo-600 group-hover:text-indigo-900" />
                    <span className="text-sm font-bold text-slate-800">{dict?.Reports?.Statements?.Receipts}</span>
                </Link>
                <Link href="/dashboard/vouchers" className="bg-orange-50 hover:bg-orange-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all border border-orange-200 group">
                    <ArrowUpRight className="mb-2 text-orange-600 group-hover:text-orange-900" />
                    <span className="text-sm font-bold text-slate-800">{dict?.Reports?.Statements?.Payments}</span>
                </Link>
                <Link href="/dashboard/reports/income-statement" className="bg-yellow-50 hover:bg-yellow-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all border border-yellow-200 group">
                    <TrendingUp className="mb-2 text-yellow-600 group-hover:text-yellow-900" />
                    <span className="text-sm font-bold text-slate-800">{dict?.Reports?.Statements?.ProfitAndLoss}</span>
                </Link>

                {/* The New Compact Tax Section */}
                <Link href="#" className="bg-violet-50 hover:bg-violet-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all border border-violet-200 group col-span-2 lg:col-span-4">
                    <div className="flex items-center gap-4">
                        <ShieldCheck className="text-violet-600" />
                        <div className="text-right">
                            <span className="text-sm font-black text-slate-900 block">{dict?.Reports?.TaxDashboard?.Title}</span>
                            <span className="text-[10px] font-bold text-slate-500">{dict?.Reports?.TaxDashboard?.Desc}</span>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
