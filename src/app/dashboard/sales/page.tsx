import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Download } from "lucide-react";
import { desc } from "drizzle-orm";
import { getDictionary } from "@/lib/i18n-server";

export default async function SalesPage() {
    const dict = await getDictionary();
    let invoicesList = [];
    try {
        invoicesList = await db.select().from(invoices).orderBy(desc(invoices.issueDate));
    } catch (e) {
        console.warn("DB not ready");
        // Mock data
        invoicesList = [
            { id: 1, invoiceNumber: "INV-839210", customerName: "شركة الرواد التقنية", issueDate: "2024-01-15", totalAmount: "14375.00", status: "issued" },
            { id: 2, invoiceNumber: "INV-839211", customerName: "خالد محمد", issueDate: "2024-01-16", totalAmount: "172.50", status: "paid" },
        ];
    }

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

            <div className="bg-white p-4 rounded-lg border shadow-sm">
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
                        {invoicesList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    {dict.Sales.Table.NoInvoices}
                                </TableCell>
                            </TableRow>
                        ) : (
                            invoicesList.map((inv) => (
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
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                                            inv.status === 'issued' ? 'bg-blue-100 text-blue-700' :
                                                inv.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700' // cancelled
                                            }`}>
                                            {inv.status === 'paid' ? dict.Sales.Table.Paid :
                                                inv.status === 'issued' ? dict.Sales.Table.Issued :
                                                    inv.status === 'draft' ? dict.Sales.Table.Draft : dict.Sales.Table.Cancelled}
                                        </span>
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
        </div>
    );
}
