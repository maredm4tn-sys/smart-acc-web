"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getIncomeStatementData } from "@/features/reports/actions";
import { Loader2, TrendingDown, TrendingUp, DollarSign, Calendar as CalendarIcon, Filter, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/providers/i18n-provider";

export default function IncomeStatementPage() {
    const { dict, lang } = useTranslation();

    // Format currency helper
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Default to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState<string>(firstDay.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(lastDay.toISOString().split('T')[0]);

    // Data State
    const [data, setData] = useState<{
        totalRevenue: number;
        totalExpenses: number;
        netProfit: number;
        expenseDetails: { name: string; value: number }[];
    } | null>(null);

    const [isPending, startTransition] = useTransition();

    const handleSearch = () => {
        startTransition(async () => {
            try {
                const result = await getIncomeStatementData(new Date(startDate), new Date(endDate));
                setData(result);
            } catch (error) {
                console.error("Failed to fetch report", error);
                // Could add toast here
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

                    {/* Detailed Table (Desktop) */}
                    <Card className="border-none shadow-md bg-white hidden md:block">
                        <CardHeader className="border-b border-gray-100 pb-4">
                            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-gray-500" />
                                {dict.Reports.IncomeStatement.ExpenseDetails}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow>
                                        <TableHead className="text-right font-bold text-gray-600">{dict.Reports.IncomeStatement.Table.Item}</TableHead>
                                        <TableHead className="text-left font-bold text-gray-900">{dict.Reports.IncomeStatement.Table.Value}</TableHead>
                                        <TableHead className="text-left font-bold text-gray-600">{dict.Reports.IncomeStatement.Table.Percentage}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.expenseDetails.length > 0 ? (
                                        data.expenseDetails.map((item, index) => (
                                            <TableRow key={index} className="hover:bg-blue-50/30 transition-colors">
                                                <TableCell className="font-medium text-gray-700">{item.name}</TableCell>
                                                <TableCell className="text-left font-bold text-gray-900 dir-ltr">{formatCurrency(item.value)}</TableCell>
                                                <TableCell className="text-left text-sm text-gray-500 dir-ltr">
                                                    {data.totalExpenses > 0
                                                        ? ((item.value / data.totalExpenses) * 100).toFixed(1) + '%'
                                                        : '0%'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-gray-500">
                                                {dict.Reports.IncomeStatement.Table.NoExpenses}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Mobile Card View (Expenses) */}
                    <div className="md:hidden space-y-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-gray-500" />
                            {dict.Reports.IncomeStatement.ExpenseDetails}
                        </h3>
                        {data.expenseDetails.length > 0 ? (
                            data.expenseDetails.map((item, index) => (
                                <Card key={index} className="border-none shadow-sm bg-white">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">{item.name}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {data.totalExpenses > 0
                                                    ? ((item.value / data.totalExpenses) * 100).toFixed(1) + '%'
                                                    : '0%'}
                                            </p>
                                        </div>
                                        <div className="font-bold text-gray-900 dir-ltr">
                                            {formatCurrency(item.value)}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-dashed">
                                {dict.Reports.IncomeStatement.Table.NoExpenses}
                            </div>
                        )}
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
