"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getCategorySales } from "@/features/reports/actions";
import { useTranslation } from "@/components/providers/i18n-provider";
import { Loader2, PieChart, Search } from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function CategoryReportPage() {
    const { dict, lang } = useTranslation() as any;

    // Default to current year starting Jan 1st and end of current month
    const today = new Date();
    const currentYear = today.getFullYear();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState<string>(`${currentYear}-01-01`);
    const [endDate, setEndDate] = useState<string>(lastDayOfMonth.toISOString().split('T')[0]);

    const [data, setData] = useState<{ name: string; value: number; count: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async () => {
        setLoading(true);
        try {
            // Convert string dates back to Date objects for the server action
            const from = new Date(startDate);
            const to = new Date(endDate);
            const res = await getCategorySales(from, to);
            setData(res);
            setHasSearched(true);
        } finally {
            setLoading(false);
        }
    };

    const totalRevenue = data.reduce((acc, item) => acc + item.value, 0);

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{dict.Reports.DepartmentSalesPage.Title}</h1>
                    <p className="text-muted-foreground mt-1">{dict.Reports.DepartmentSalesPage.Description}</p>
                </div>
            </div>

            {/* Filter Card - Styled like Statement Report */}
            <Card>
                <CardHeader>
                    <CardTitle>{dict.Reports.DepartmentSalesPage.Options}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="space-y-2 w-full md:w-1/3">
                            <Label>{dict.Reports.DepartmentSalesPage.FromDate}</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2 w-full md:w-1/3">
                            <Label>{dict.Reports.DepartmentSalesPage.ToDate}</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>

                        <div className="w-full md:w-auto">
                            <Button onClick={handleSearch} disabled={loading} className="w-full md:w-auto">
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {!loading && <Search className="w-4 h-4 ml-2" />}
                                {dict.Reports.DepartmentSalesPage.ShowReport}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            {hasSearched && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {dict.Reports.DepartmentSalesPage.TotalRevenue}
                            </CardTitle>
                            <PieChart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalRevenue.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {dict.Common.EGP}</div>
                            <p className="text-xs text-muted-foreground">
                                {dict.Reports.DepartmentSalesPage.FromCategories.replace('{count}', data.length.toString())}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Details Card */}
            {hasSearched && (
                <Card>
                    <CardHeader>
                        <CardTitle>{dict.Reports.DepartmentSalesPage.DetailsTitle}</CardTitle>
                        <CardDescription>
                            {dict.Reports.DepartmentSalesPage.DetailsDesc}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px] text-start">{dict.Reports.DepartmentSalesPage.Table.Hash}</TableHead>
                                        <TableHead className="text-start">{dict.Reports.DepartmentSalesPage.Table.Category}</TableHead>
                                        <TableHead className="text-center">{dict.Reports.DepartmentSalesPage.Table.Count}</TableHead>
                                        <TableHead className="text-end">{dict.Reports.DepartmentSalesPage.Table.Revenue}</TableHead>
                                        <TableHead className="text-end">{dict.Reports.DepartmentSalesPage.Table.Percentage}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                                {dict.Reports.DepartmentSalesPage.Table.NoData}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium text-start">{index + 1}</TableCell>
                                                <TableCell className="font-semibold text-start">{item.name}</TableCell>
                                                <TableCell className="text-center">{item.count}</TableCell>
                                                <TableCell className="text-end font-bold text-green-600 dir-ltr">
                                                    {item.value.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {dict.Common.EGP}
                                                </TableCell>
                                                <TableCell className="text-end text-muted-foreground">
                                                    {totalRevenue > 0 ? ((item.value / totalRevenue) * 100).toFixed(1) + '%' : '0%'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
