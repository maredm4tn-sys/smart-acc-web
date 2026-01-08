"use client";

import { useState, useTransition } from "react";
// import useSWR from "swr";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, FileText, Download, Calendar, User, RotateCcw, ArrowLeftRight } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";
import { getInvoices } from "@/features/sales/actions";
import { ReturnInvoiceDialog } from "@/features/sales/components/return-invoice-dialog";
import { Badge } from "@/components/ui/badge";

export function InvoicesTable({ initialInvoices }: { initialInvoices: any[] }) {
    const { dict: rawDict } = useTranslation();
    const dict = rawDict as any;
    const [returnDialogOpen, setReturnDialogOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    // Pagination State
    const [invoices, setInvoices] = useState<any[]>(initialInvoices || []);
    const [page, setPage] = useState(1);
    const [canNext, setCanNext] = useState((initialInvoices?.length || 0) === 50); // Heuristic
    const [isPending, startTransition] = useTransition();

    const loadPage = (newPage: number) => {
        startTransition(async () => {
            try {
                const res = await getInvoices(newPage, 50);
                setInvoices(res.invoices);
                setCanNext(res.hasNextPage);
                setPage(newPage);
            } catch (e) {
                console.error("Failed to load page", e);
            }
        });
    };

    const handleOpenReturn = (invoice: any) => {
        setSelectedInvoice(invoice);
        setReturnDialogOpen(true);
    };

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
                            <TableHead>{dict.Sales.Table.Type}</TableHead>
                            <TableHead>{dict.Sales.Table.Status}</TableHead>
                            <TableHead>{dict.Sales.Table.Total}</TableHead>
                            <TableHead className="text-end">{dict.Sales.Table.Actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    {dict.Sales.Table.NoInvoices}
                                </TableCell>
                            </TableRow>
                        ) : (
                            invoices.map((inv) => (
                                <TableRow key={inv.id} className={inv.type === 'return' ? 'bg-orange-50/50' : ''}>
                                    <TableCell className="font-medium">
                                        <Link href={`/dashboard/sales/${inv.id}`} className="flex items-center gap-2 hover:underline">
                                            <FileText className="h-4 w-4 text-gray-400" />
                                            {inv.invoiceNumber}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{inv.customerName}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col items-start gap-0.5">
                                            <span className="font-medium text-gray-700">{inv.issueDate}</span>
                                            <span className="text-[11px] text-muted-foreground dir-ltr">
                                                {inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={inv.type === 'return' ? 'destructive' : 'secondary'} className={inv.type === 'return' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' : ''}>
                                            {inv.type === 'return' ? dict.Sales.Table.Types.Return : dict.Sales.Table.Types.Sale}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={inv.status} dict={dict} />
                                    </TableCell>
                                    <TableCell className={`font-bold dir-ltr text-start ${inv.type === 'return' ? 'text-orange-600' : ''}`}>
                                        {Number(inv.totalAmount).toLocaleString()} EGP
                                    </TableCell>
                                    <TableCell className="text-end">
                                        <div className="flex justify-end gap-1">
                                            {inv.type !== 'return' && inv.status !== 'cancelled' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title={dict.Sales.Table.CreateReturn}
                                                    onClick={() => handleOpenReturn(inv)}
                                                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                >
                                                    <RotateCcw size={16} />
                                                </Button>
                                            )}
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
                {invoices.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">{dict.Sales.Table.NoInvoices}</div>
                ) : (
                    invoices.map((inv) => (
                        <Card key={inv.id} className={`overflow-hidden border-l-4 ${inv.type === 'return' ? 'border-l-orange-500 bg-orange-50/30' : 'border-l-blue-500'}`}>
                            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <Link href={`/dashboard/sales/${inv.id}`} className="font-bold text-lg hover:underline">
                                            {inv.invoiceNumber}
                                        </Link>
                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                            {inv.type === 'return' ? dict.Sales.Table.Types.Return : dict.Sales.Table.Types.Sale}
                                        </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                        <Calendar size={12} />
                                        {inv.issueDate}
                                        {inv.createdAt && <span className="text-[10px] bg-gray-100 px-1 rounded mx-1 dir-ltr">{new Date(inv.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>}
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
                                        <div className={`font-bold text-xl dir-ltr text-end ${inv.type === 'return' ? 'text-orange-600' : 'text-blue-600'}`}>
                                            {Number(inv.totalAmount).toLocaleString()} <span className="text-xs text-gray-500">EGP</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {inv.type !== 'return' && (
                                            <Button variant="outline" size="sm" onClick={() => handleOpenReturn(inv)} className="text-orange-600 border-orange-200 bg-orange-50">
                                                <RotateCcw size={14} />
                                            </Button>
                                        )}
                                        <Link href={`/dashboard/sales/${inv.id}/print`} target="_blank">
                                            <Button variant="outline" size="sm" className="gap-2">
                                                <Download size={14} />
                                                {dict.Sales.Table.Print}
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadPage(page - 1)}
                    disabled={page <= 1 || isPending}
                >
                    {dict.Common.Previous}
                </Button>
                <div className="text-sm font-medium">
                    {dict.Common.Page} {page}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadPage(page + 1)}
                    disabled={!canNext || isPending}
                >
                    {dict.Common.Next}
                </Button>
            </div>

            {selectedInvoice && (
                <ReturnInvoiceDialog
                    open={returnDialogOpen}
                    onOpenChange={setReturnDialogOpen}
                    invoice={selectedInvoice}
                />
            )}
        </div>
    );
}

function StatusBadge({ status, dict }: { status: string, dict: any }) {
    const styles: any = {
        paid: 'bg-green-100 text-green-700',
        issued: 'bg-blue-100 text-blue-700',
        draft: 'bg-yellow-100 text-yellow-700',
        cancelled: 'bg-red-100 text-red-700',
        returned: 'bg-orange-100 text-orange-700', // Style for returned
        partially_returned: 'bg-yellow-50 text-yellow-700 border border-yellow-200', // Style for partial
    };

    const labels: any = {
        paid: dict.Sales.Table.Paid,
        issued: dict.Sales.Table.Issued,
        draft: dict.Sales.Table.Draft,
        cancelled: dict.Sales.Table.Cancelled,
        returned: dict.Sales.Table.StatusLabels.Returned,
        partially_returned: dict.Sales.Table.StatusLabels.PartiallyReturned,
    };

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
            {labels[status] || status}
        </span>
    );
}
