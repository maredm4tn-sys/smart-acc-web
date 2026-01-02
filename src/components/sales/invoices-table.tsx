"use client";

import useSWR from "swr";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, FileText, Download, Calendar, User } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";
import { getInvoices } from "@/features/sales/actions";

export function InvoicesTable({ initialInvoices }: { initialInvoices: any[] }) {
    const { dict } = useTranslation();

    const { data: invoicesList } = useSWR('invoices-list', getInvoices, {
        fallbackData: initialInvoices,
        revalidateOnMount: false // Rely on initial data first, then revalidate on focus/nav
    });

    const safeInvoices = invoicesList || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{dict.Sales.Title}</h1>
                    <p className="text-muted-foreground">{dict.Sales.Description}</p>
                </div>
                <Link href="/dashboard/sales/create">
                    <Button className="gap-2">
                        <Plus size={16} />
                        <span>{dict.Sales.NewInvoice}</span>
                    </Button>
                </Link>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block bg-white p-4 rounded-lg border shadow-sm container-desktop">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{dict.Sales.Table.InvoiceNumber}</TableHead>
                            <TableHead>{dict.Sales.Table.Customer}</TableHead>
                            <TableHead>{dict.Sales.Table.Date}</TableHead>
                            <TableHead>{dict.Sales.Table.Status}</TableHead>
                            <TableHead>{dict.Sales.Table.Total}</TableHead>
                            <TableHead className="text-end">{dict.Sales.Table.Actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {safeInvoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    {dict.Sales.Table.NoInvoices}
                                </TableCell>
                            </TableRow>
                        ) : (
                            safeInvoices.map((inv) => (
                                <TableRow key={inv.id}>
                                    <TableCell className="font-medium">
                                        <Link href={`/dashboard/sales/${inv.id}`} className="flex items-center gap-2 hover:underline">
                                            <FileText className="h-4 w-4 text-gray-400" />
                                            {inv.invoiceNumber}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{inv.customerName}</TableCell>
                                    <TableCell>{inv.issueDate}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={inv.status} dict={dict} />
                                    </TableCell>
                                    <TableCell className="font-bold dir-ltr text-start">{Number(inv.totalAmount).toLocaleString()} EGP</TableCell>
                                    <TableCell className="text-end">
                                        <div className="flex justify-end gap-1">
                                            <Link href={`/dashboard/sales/${inv.id}/print`} target="_blank">
                                                <Button variant="ghost" size="icon" title={dict.Sales.Table.Print}>
                                                    <Download size={16} />
                                                </Button>
                                            </Link>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 container-mobile">
                {safeInvoices.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">{dict.Sales.Table.NoInvoices}</div>
                ) : (
                    safeInvoices.map((inv) => (
                        <Card key={inv.id} className="overflow-hidden border-l-4 border-l-blue-500">
                            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                                <div className="flex flex-col">
                                    <Link href={`/dashboard/sales/${inv.id}`} className="font-bold text-lg hover:underline flex items-center gap-2">
                                        {inv.invoiceNumber}
                                    </Link>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar size={12} />
                                        {inv.issueDate}
                                    </span>
                                </div>
                                <StatusBadge status={inv.status} dict={dict} />
                            </CardHeader>
                            <CardContent className="p-4 pt-2">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <User size={14} />
                                            <span>{inv.customerName}</span>
                                        </div>
                                        <div className="font-bold text-xl text-blue-600 dir-ltr text-end">
                                            {Number(inv.totalAmount).toLocaleString()} <span className="text-xs text-gray-500">EGP</span>
                                        </div>
                                    </div>
                                    <Link href={`/dashboard/sales/${inv.id}/print`} target="_blank">
                                        <Button variant="outline" size="sm" className="gap-2">
                                            <Download size={14} />
                                            {dict.Sales.Table.Print}
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status, dict }: { status: string, dict: any }) {
    const styles: any = {
        paid: 'bg-green-100 text-green-700',
        issued: 'bg-blue-100 text-blue-700',
        draft: 'bg-yellow-100 text-yellow-700',
        cancelled: 'bg-red-100 text-red-700'
    };

    const labels: any = {
        paid: dict.Sales.Table.Paid,
        issued: dict.Sales.Table.Issued,
        draft: dict.Sales.Table.Draft,
        cancelled: dict.Sales.Table.Cancelled
    };

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
            {labels[status] || status}
        </span>
    );
}
