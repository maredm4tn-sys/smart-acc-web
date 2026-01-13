"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getRepresentativeReport } from "../actions";
import { toast } from "sonner";
import { Search, Calculator, Wallet, Receipt } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";
import { PayCommissionDialog } from "./pay-commission-dialog";

interface RepresentativeReportProps {
    representativeId: number;
}

export function RepresentativeReport({ representativeId }: RepresentativeReportProps) {
    const { dict } = useTranslation();
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
    });

    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [payDialogOpen, setPayDialogOpen] = useState(false);

    const handleSearch = async () => {
        if (!date?.from || !date?.to) {
            toast.error("Please select a date range");
            return;
        }

        setLoading(true);
        try {
            const startDate = format(date.from, "yyyy-MM-dd");
            const endDate = format(date.to, "yyyy-MM-dd");
            const data = await getRepresentativeReport(representativeId, startDate, endDate);
            setReportData(data);
        } catch (error) {
            toast.error("Failed to fetch report");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-md">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary" />
                        {dict.Representatives?.Reports?.Title || "Performance Report"}
                    </CardTitle>
                    <CardDescription>
                        {dict.Representatives?.Reports?.Description || "View sales performance and calculate commissions."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="w-full sm:w-auto">
                            <label className="text-sm font-medium mb-1 block text-muted-foreground">{dict.Common?.DateRange || "Date Range"}</label>
                            <DateRangePicker date={date} onSelect={setDate} />
                        </div>
                        <Button onClick={handleSearch} disabled={loading} className="w-full sm:w-auto min-w-[120px]">
                            {loading ? (dict.Common?.Loading || "Loading...") : (
                                <>
                                    <Search className="mr-2 h-4 w-4" />
                                    {dict.Common?.Search || "Search"}
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {reportData && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <Card className="bg-blue-50 border-blue-100">
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                <span className="text-sm text-blue-600 font-medium mb-1">{dict.Representatives?.Reports?.TotalSales || "Total Sales"}</span>
                                <div className="text-xl font-bold text-blue-700">
                                    {Number(reportData.summary.totalSales).toLocaleString()} <span className="text-xs font-normal">EGP</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {reportData.summary.invoicesCount} {dict.Invoices?.Title || "Invoices"}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-green-50 border-green-100">
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                <span className="text-sm text-green-600 font-medium mb-1">{dict.Representatives?.Reports?.Collected || "Collected Amount"}</span>
                                <div className="text-xl font-bold text-green-700">
                                    {Number(reportData.summary.totalCollected).toLocaleString()} <span className="text-xs font-normal">EGP</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-amber-50 border-amber-100">
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                <span className="text-sm text-amber-600 font-medium mb-1">{dict.Representatives?.Reports?.CommissionRate || "Commission Rate"}</span>
                                <div className="text-xl font-bold text-amber-700">
                                    {reportData.summary.commissionRate}
                                    <span className="text-xs font-normal ml-1">
                                        {reportData.summary.commissionType === 'percentage' ? '%' : 'EGP / Inv'}
                                    </span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {reportData.summary.commissionType === 'percentage' ? 'On Sales' : 'Per Invoice'}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-indigo-50 border-indigo-100">
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                <span className="text-sm text-indigo-600 font-medium mb-1">{dict.Representatives?.Reports?.Salary || "Monthly Salary"}</span>
                                <div className="text-xl font-bold text-indigo-700">
                                    {Number(reportData.summary.salary).toLocaleString()} <span className="text-xs font-normal">EGP</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-purple-50 border-purple-100 shadow-sm relative overflow-hidden col-span-1 sm:col-span-2 lg:col-span-1">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <Wallet size={64} />
                            </div>
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center relative z-10">
                                <span className="text-sm text-purple-600 font-bold mb-1">{dict.Representatives?.Reports?.CommissionAmount || "Commission (Due)"}</span>
                                <div className="text-2xl font-extrabold text-purple-800 mb-2">
                                    {Number(reportData.summary.totalDue).toLocaleString()} <span className="text-xs font-normal">EGP</span>
                                </div>
                                <p className="text-[10px] text-purple-500 mb-2">
                                    (Salary + Commission)
                                </p>
                                <Button
                                    size="sm"
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                    onClick={() => setPayDialogOpen(true)}
                                    disabled={reportData.summary.totalDue <= 0}
                                >
                                    <Wallet className="mr-2 h-4 w-4" />
                                    {dict.Representatives?.Reports?.Settle || "Settle & Pay"}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    <PayCommissionDialog
                        open={payDialogOpen}
                        setOpen={setPayDialogOpen}
                        data={{
                            representativeId,
                            amount: reportData.summary.totalDue,
                            period: `${format(date?.from!, 'yyyy-MM-dd')} to ${format(date?.to!, 'yyyy-MM-dd')}`,
                            name: reportData.representative.name
                        }}
                    />

                    {/* Invoices Table */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-muted-foreground" />
                                {dict.Representatives?.Reports?.InvoicesList || "Sales Invoices"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px] text-center">{dict.Invoices?.Table?.InvoiceNumber || "Ref"}</TableHead>
                                            <TableHead className="text-center">{dict.Invoices?.Table?.IssueDate || dict.Common?.Date || "Date"}</TableHead>
                                            <TableHead className="text-center">{dict.Invoices?.Table?.Customer || "Customer"}</TableHead>
                                            <TableHead className="text-center">{dict.Invoices?.Table?.Total || "Total"}</TableHead>
                                            <TableHead className="text-center">{dict.Invoices?.Table?.Paid || "Paid"}</TableHead>
                                            <TableHead className="text-center">{dict.Invoices?.Table?.Status || "Status"}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportData.invoices.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                                    {dict.Common?.NoData || "No data found within this range."}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            reportData.invoices.map((inv: any) => (
                                                <TableRow key={inv.id}>
                                                    <TableCell className="font-mono text-center">{inv.invoiceNumber}</TableCell>
                                                    <TableCell className="text-center text-sm">{format(new Date(inv.date), 'yyyy-MM-dd')}</TableCell>
                                                    <TableCell className="text-center">{inv.customerName}</TableCell>
                                                    <TableCell className="text-center font-bold">
                                                        {Number(inv.totalAmount).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-center text-green-600">
                                                        {Number(inv.amountPaid).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant={inv.paymentStatus === 'paid' ? 'default' : inv.paymentStatus === 'partial' ? 'secondary' : 'destructive'} className="text-[10px]">
                                                            {inv.paymentStatus}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
