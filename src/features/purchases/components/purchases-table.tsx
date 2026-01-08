"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, FileText, RotateCcw, Pencil } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { ReturnPurchaseDialog } from "./return-purchase-dialog";

export function PurchasesTable({ initialInvoices }: { initialInvoices: any[] }) {
    const { dict: rawDict } = useTranslation();
    const dict = rawDict as any;

    const [invoices, setInvoices] = useState<any[]>(initialInvoices || []);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [showReturnDialog, setShowReturnDialog] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{dict.Purchases.Title}</h1>
                    <p className="text-muted-foreground">{dict.Purchases.Description}</p>
                </div>
                <Link href="/dashboard/purchases/create">
                    <Button className="gap-2">
                        <Plus size={16} />
                        <span>{dict.Purchases.NewInvoice}</span>
                    </Button>
                </Link>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block bg-white p-4 rounded-lg border shadow-sm container-desktop">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">{dict.Purchases.Table.InvoiceNo}</TableHead>
                            <TableHead className="text-right">{dict.Purchases.Table.Supplier}</TableHead>
                            <TableHead className="text-right">{dict.Purchases.Table.Date}</TableHead>
                            <TableHead className="text-right">{dict.Purchases.Table.Status}</TableHead>
                            <TableHead className="text-right">{dict.Purchases.Table.Total}</TableHead>
                            <TableHead className="text-right">{dict.Purchases.Table.PaidAmount}</TableHead>
                            <TableHead className="text-right">{dict.Purchases.Table.Balance}</TableHead>
                            <TableHead className="text-right">{dict.Purchases.Table.Actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    {dict.Purchases.Table.NoInvoices}
                                </TableCell>
                            </TableRow>
                        ) : (
                            invoices.map((inv) => (
                                <TableRow key={inv.id} className={inv.type === 'return' ? 'bg-red-50/30' : ''}>
                                    <TableCell className="font-medium text-right">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-gray-400" />
                                            {inv.invoiceNumber === 'DRAFT' ? dict.Purchases.Table.Draft : inv.invoiceNumber}
                                            {inv.type === 'return' && <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">{dict.Purchases.Table.Returned}</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">{inv.supplier ? inv.supplier.name : inv.supplierName}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-start gap-0.5">
                                            <span className="font-medium text-gray-700">{inv.issueDate}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="outline">
                                            {inv.paymentStatus === 'paid' ? dict.Purchases.Table.StatusLabels.Paid :
                                                inv.paymentStatus === 'unpaid' ? dict.Purchases.Table.StatusLabels.Unpaid :
                                                    inv.paymentStatus === 'partial' ? dict.Purchases.Table.StatusLabels.Partial : inv.paymentStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-bold dir-ltr text-right">
                                        {(Number(inv.totalAmount)).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right text-green-600 font-medium dir-ltr">
                                        {(Number(inv.amountPaid || 0)).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right text-red-600 font-bold dir-ltr">
                                        {(Number(inv.totalAmount) - Number(inv.amountPaid || 0)).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-1">
                                            {inv.type !== 'return' && (
                                                <Link href={`/dashboard/purchases/edit/${inv.id}`}>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1 h-8 px-2"
                                                    >
                                                        <Pencil size={14} />
                                                        <span className="text-xs">{dict.Purchases.Table.Edit}</span>
                                                    </Button>
                                                </Link>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1 h-8 px-2"
                                                onClick={() => {
                                                    setSelectedInvoice(inv);
                                                    setShowReturnDialog(true);
                                                }}
                                            >
                                                <RotateCcw size={14} />
                                                <span className="text-xs">{dict.Purchases.Table.Return}</span>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View - Simplified */}
            <div className="md:hidden space-y-4">
                {invoices.length === 0 && (
                    <div className="text-center text-gray-500 py-8">{dict.Purchases.Table.NoInvoices}</div>
                )}
                {invoices.map((inv) => (
                    <Card key={inv.id} className={inv.type === 'return' ? 'border-red-200 bg-red-50/20' : ''}>
                        <CardHeader className="p-4">
                            <div className="flex justify-between">
                                <span className="font-bold flex items-center gap-2">
                                    {inv.invoiceNumber === 'DRAFT' ? dict.Purchases.Table.Draft : inv.invoiceNumber}
                                    {inv.type === 'return' && <Badge className="bg-red-100 text-red-700 scale-75">{dict.Purchases.Table.Returned}</Badge>}
                                </span>
                                <span className="text-sm">{inv.issueDate}</span>
                            </div>
                            <div className="text-sm text-gray-500">{inv.supplierName}</div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-dashed">
                                <div className="text-xs text-gray-500">{dict.Purchases.Table.Total}</div>
                                <div className="font-bold">{Number(inv.totalAmount).toLocaleString()} EGP</div>
                            </div>
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-dashed">
                                <div className="text-xs text-green-600">{dict.Purchases.Table.PaidAmount}</div>
                                <div className="font-medium text-green-600">{Number(inv.amountPaid || 0).toLocaleString()} EGP</div>
                            </div>
                            <div className="flex justify-between items-center mb-3">
                                <div className="text-xs text-red-600 font-bold">{dict.Purchases.Table.Balance}</div>
                                <div className="font-bold text-red-600 underline">{(Number(inv.totalAmount) - Number(inv.amountPaid || 0)).toLocaleString()} EGP</div>
                            </div>

                            <div className="flex justify-between items-center">
                                <Badge variant="outline">
                                    {inv.paymentStatus === 'paid' ? dict.Purchases.Table.StatusLabels.Paid :
                                        inv.paymentStatus === 'unpaid' ? dict.Purchases.Table.StatusLabels.Unpaid :
                                            inv.paymentStatus === 'partial' ? dict.Purchases.Table.StatusLabels.Partial : inv.paymentStatus}
                                </Badge>
                                {inv.type !== 'return' && (
                                    <div className="flex gap-2">
                                        <Link href={`/dashboard/purchases/edit/${inv.id}`}>
                                            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200">
                                                <Pencil size={14} />
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 border-red-200"
                                            onClick={() => {
                                                setSelectedInvoice(inv);
                                                setShowReturnDialog(true);
                                            }}
                                        >
                                            <RotateCcw size={14} />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {selectedInvoice && (
                <ReturnPurchaseDialog
                    open={showReturnDialog}
                    onOpenChange={setShowReturnDialog}
                    invoice={selectedInvoice}
                />
            )}
        </div>
    );
}
