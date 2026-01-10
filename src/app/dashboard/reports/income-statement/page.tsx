"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getIncomeStatementData, getProfitExport } from "@/features/reports/actions";
import { getSession } from "@/features/auth/actions";
import { ExcelExportButton } from "@/components/common/excel-export-button";
import { Loader2, TrendingDown, TrendingUp, DollarSign, Calendar as CalendarIcon, Filter, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/providers/i18n-provider";

export default function IncomeStatementPage() {
    const { dict, lang } = useTranslation();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        getSession().then(s => {
            if (s?.role === 'admin' || s?.role === 'SUPER_ADMIN') setIsAdmin(true);
        });
    }, []);

    // Format currency helper
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 2
        }).format(amount).replace('EGP', dict.Common.EGP).replace('ج.م.‏', dict.Common.EGP);
    };

    // Default to current year starting Jan 1st and end of current month
    const today = new Date();
    const currentYear = today.getFullYear();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState<string>(`${currentYear}-01-01`);
    const [endDate, setEndDate] = useState<string>(lastDayOfMonth.toISOString().split('T')[0]);

    // Interface for detail items
    interface DetailItem {
        date: string;
        createdAt?: Date | null;
        entryNumber: string; // Added entryNumber
        name: string;
        accountName: string;
        value: number;
    }

    // Robust Time Extractor
    const getTimeFromItem = (item: DetailItem) => {
        // 1. Try createdAt
        if (item.createdAt) {
            const dateObj = new Date(item.createdAt);
            // Fix 1970 issue
            if (dateObj.getFullYear() === 1970) {
                return new Date(dateObj.getTime() * 1000);
            }
            return dateObj;
        }

        // 2. Try entryNumber (JE-<Timestamp>)
        if (item.entryNumber && item.entryNumber.startsWith('JE-')) {
            const ts = parseInt(item.entryNumber.replace('JE-', ''), 10);
            if (!isNaN(ts)) {
                return new Date(ts);
            }
        }

        return null;
    };

    // Data State
    const [data, setData] = useState<{
        totalRevenue: number;
        totalExpenses: number;
        netProfit: number;
        expenseDetails: DetailItem[];
        revenueDetails?: DetailItem[];
    } | null>(null);

    const [isPending, startTransition] = useTransition();

    const handleSearch = () => {
        startTransition(async () => {
            try {
                const result = await getIncomeStatementData(new Date(startDate), new Date(endDate));
                setData(result);
            } catch (error) {
                console.error("Failed to fetch report", error);
            }
        });
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">{dict.Reports.IncomeStatement.Title}</h2>
                    <p className="text-slate-500 mt-1">{dict.Reports.IncomeStatement.Subtitle}</p>
                </div>
                {isAdmin && (
                    <ExcelExportButton
                        getData={getProfitExport}
                        fileName="Profit_Report"
                        label={dict.Reports.IncomeStatement.ExportComprehensive}
                    />
                )}
            </div>

            {/* Filter Section */}
            <Card className="border-none shadow-sm bg-white">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-end gap-4">
                        <div className="grid gap-2 w-full sm:w-auto">
                            <label className="text-sm font-medium text-gray-700">{dict.Reports.IncomeStatement.FromDate}</label>
                            <div className="relative">
                                <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    aria-label={dict.Reports.IncomeStatement.FromDate}
                                    className="w-full sm:w-[200px] pr-10 pl-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2 w-full sm:w-auto">
                            <label className="text-sm font-medium text-gray-700">{dict.Reports.IncomeStatement.ToDate}</label>
                            <div className="relative">
                                <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    aria-label={dict.Reports.IncomeStatement.ToDate}
                                    className="w-full sm:w-[200px] pr-10 pl-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                />
                            </div>
                        </div>
                        <Button
                            onClick={handleSearch}
                            disabled={isPending}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        >
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
                            {dict.Reports.IncomeStatement.ShowReport}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Report Content */}
            {data ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Stat Cards */}
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* Revenue */}
                        <Card className="border-none shadow-md bg-white border-r-4 border-r-emerald-500 overflow-hidden relative">
                            <CardContent className="p-6">
                                <div className="text-sm font-medium text-gray-500 mb-1">{dict.Reports.IncomeStatement.TotalRevenue}</div>
                                <div className="text-2xl font-bold text-emerald-600 flex items-center gap-2 dir-ltr">
                                    {formatCurrency(data.totalRevenue)}
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Expenses */}
                        <Card className="border-none shadow-md bg-white border-r-4 border-r-red-500 overflow-hidden relative">
                            <CardContent className="p-6">
                                <div className="text-sm font-medium text-gray-500 mb-1">{dict.Reports.IncomeStatement.TotalExpenses}</div>
                                <div className="text-2xl font-bold text-red-600 flex items-center gap-2 dir-ltr">
                                    {formatCurrency(data.totalExpenses)}
                                    <TrendingDown className="h-5 w-5" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Net Profit */}
                        <Card className={cn(
                            "border-none shadow-md border-r-4 overflow-hidden relative",
                            data.netProfit >= 0 ? "bg-blue-600 text-white border-r-blue-400" : "bg-red-600 text-white border-r-red-400"
                        )}>
                            <CardContent className="p-6">
                                <div className="text-sm font-medium text-blue-100 mb-1">{dict.Reports.IncomeStatement.NetProfit}</div>
                                <div className="text-3xl font-bold text-white flex items-center gap-2 dir-ltr">
                                    {formatCurrency(data.netProfit)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Details Tables (Desktop) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 hidden md:grid">
                        {/* Revenue Table */}
                        <Card className="border-none shadow-md bg-white h-96 flex flex-col">
                            <CardHeader className="border-b border-gray-100 pb-4 shrink-0">
                                <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                                    {dict.Reports.IncomeStatement.RevenueDetails}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 overflow-auto custom-scrollbar flex-1">
                                <Table>
                                    <TableHeader className="bg-emerald-50/50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="text-start font-bold text-gray-600 w-[80px]">{dict.Reports.IncomeStatement.Table.Date}</TableHead>
                                            <TableHead className="text-start font-bold text-gray-600">{dict.Reports.IncomeStatement.Table.Item}</TableHead>
                                            <TableHead className="text-start font-bold text-gray-600">{dict.Reports.IncomeStatement.Table.Category}</TableHead>
                                            <TableHead className="text-end font-bold text-gray-600 w-[120px]">{dict.Reports.IncomeStatement.Table.Value}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.revenueDetails && data.revenueDetails.length > 0 ? (
                                            data.revenueDetails.map((item, index) => (
                                                <TableRow key={index} className="hover:bg-emerald-50/30 transition-colors">
                                                    <TableCell className="text-xs text-gray-500 align-top whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span>{new Date(item.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                                                            {(() => {
                                                                const time = getTimeFromItem(item);
                                                                return time ? (
                                                                    <span className="text-[11px] font-mono text-blue-600 dir-ltr bg-blue-50 px-1 rounded-sm w-fit mt-0.5">
                                                                        {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                                    </span>
                                                                ) : null;
                                                            })()}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-medium text-gray-700 text-sm align-top text-start">{item.name}</TableCell>
                                                    <TableCell className="text-xs text-slate-500 align-top text-start">{item.accountName}</TableCell>
                                                    <TableCell className="text-end font-bold text-gray-900 align-top">{formatCurrency(item.value)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                                                    {dict.Reports.IncomeStatement.Table.NoRevenues}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Expenses Table */}
                        <Card className="border-none shadow-md bg-white h-96 flex flex-col">
                            <CardHeader className="border-b border-gray-100 pb-4 shrink-0">
                                <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-red-500" />
                                    {dict.Reports.IncomeStatement.ExpenseDetails}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 overflow-auto custom-scrollbar flex-1">
                                <Table>
                                    <TableHeader className="bg-red-50/50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="text-start font-bold text-gray-600 w-[80px]">{dict.Reports.IncomeStatement.Table.Date}</TableHead>
                                            <TableHead className="text-start font-bold text-gray-600">{dict.Reports.IncomeStatement.Table.Item}</TableHead>
                                            <TableHead className="text-start font-bold text-gray-600">{dict.Reports.IncomeStatement.Table.Category}</TableHead>
                                            <TableHead className="text-end font-bold text-gray-600 w-[120px]">{dict.Reports.IncomeStatement.Table.Value}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.expenseDetails.length > 0 ? (
                                            data.expenseDetails.map((item, index) => (
                                                <TableRow key={index} className="hover:bg-red-50/30 transition-colors">
                                                    <TableCell className="text-xs text-gray-500 align-top whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span>{new Date(item.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                                                            {(() => {
                                                                const time = getTimeFromItem(item);
                                                                return time ? (
                                                                    <span className="text-[11px] font-mono text-blue-600 dir-ltr bg-blue-50 px-1 rounded-sm w-fit mt-0.5">
                                                                        {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                                    </span>
                                                                ) : null;
                                                            })()}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-medium text-gray-700 text-sm align-top text-start">{item.name}</TableCell>
                                                    <TableCell className="text-xs text-slate-500 align-top text-start">{item.accountName}</TableCell>
                                                    <TableCell className="text-end font-bold text-gray-900 align-top">{formatCurrency(item.value)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                                                    {dict.Reports.IncomeStatement.Table.NoExpenses}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-6">
                        {/* Mobile Revenue */}
                        <div>
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                                <TrendingUp className="h-5 w-5 text-emerald-500" />
                                {dict.Reports.IncomeStatement.RevenueDetails}
                            </h3>
                            {data.revenueDetails && data.revenueDetails.length > 0 ? (
                                data.revenueDetails.map((item, index) => (
                                    <Card key={index} className="border-none shadow-sm bg-white mb-2">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-bold text-gray-900">{item.name}</div>
                                                <div className="font-bold text-emerald-600 dir-ltr">{formatCurrency(item.value)}</div>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-500">
                                                <div className="flex flex-col">
                                                    <span>{new Date(item.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                                                    {(() => {
                                                        const time = getTimeFromItem(item);
                                                        return time ? (
                                                            <span className="text-[11px] font-mono text-blue-600 dir-ltr bg-blue-50 px-1 rounded-sm w-fit mt-0.5">
                                                                {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                            </span>
                                                        ) : null;
                                                    })()}
                                                </div>
                                                <span>{item.accountName}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="p-4 text-center text-sm text-gray-500 bg-white rounded-lg border border-dashed">
                                    {dict.Reports.IncomeStatement.Table.NoRevenues}
                                </div>
                            )}
                        </div>

                        {/* Mobile Expenses */}
                        <div>
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                                <FileText className="h-5 w-5 text-red-500" />
                                {dict.Reports.IncomeStatement.ExpenseDetails}
                            </h3>
                            {data.expenseDetails.length > 0 ? (
                                data.expenseDetails.map((item, index) => (
                                    <Card key={index} className="border-none shadow-sm bg-white mb-2">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-bold text-gray-900">{item.name}</div>
                                                <div className="font-bold text-red-600 dir-ltr">{formatCurrency(item.value)}</div>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-500">
                                                <div className="flex flex-col">
                                                    <span>{new Date(item.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                                                    {(() => {
                                                        const time = getTimeFromItem(item);
                                                        return time ? (
                                                            <span className="text-[11px] font-mono text-blue-600 dir-ltr bg-blue-50 px-1 rounded-sm w-fit mt-0.5">
                                                                {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                            </span>
                                                        ) : null;
                                                    })()}
                                                </div>
                                                <span>{item.accountName}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="p-4 text-center text-sm text-gray-500 bg-white rounded-lg border border-dashed">
                                    {dict.Reports.IncomeStatement.Table.NoExpenses}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <Filter className="h-8 w-8 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">{dict.Reports.IncomeStatement.SelectPeriodTitle}</h3>
                    <p className="text-gray-500 mt-1 max-w-sm text-center">{dict.Reports.IncomeStatement.SelectPeriodDesc}</p>
                </div>
            )}
        </div>
    );
}
