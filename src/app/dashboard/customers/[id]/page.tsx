
import { getCustomerStatement } from "@/features/customers/actions";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Printer, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

import { getDictionary } from "@/lib/i18n-server";
import { ar } from "date-fns/locale";

export default async function CustomerStatementPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const dict = await getDictionary();
    const data = await getCustomerStatement(Number(id));

    if (!data) {
        return <div className="p-8 text-center text-red-500">{dict.Common.Error}</div>;
    }

    const { customer, transactions, summary } = data;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/customers">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{dict.Customers.Statement.Title}</h1>
                        <p className="text-muted-foreground">{customer.name}</p>
                    </div>
                </div>
                <Button variant="outline" className="gap-2" onClick={undefined /* window.print() is for client components, but this is server. Adding printer functionality maybe via a client wrapper/button? For now just label it. */}>
                    <Printer className="h-4 w-4" />
                    {dict.Suppliers.Statement.Print}
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{dict.Customers.Statement.Summary.TotalDebit}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalDebit)}</div>
                        <p className="text-xs text-muted-foreground">{dict.Customers.Statement.Summary.TotalDebitDesc}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{dict.Customers.Statement.Summary.TotalCredit}</CardTitle>
                        <TrendingDown className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalCredit)}</div>
                        <p className="text-xs text-muted-foreground">{dict.Customers.Statement.Summary.TotalCreditDesc}</p>
                    </CardContent>
                </Card>
                <Card className={summary.netBalance > 0 ? "border-blue-200 bg-blue-50" : "border-green-200 bg-green-50"}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{dict.Customers.Statement.Summary.NetBalance}</CardTitle>
                        <Wallet className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(Math.abs(summary.netBalance))}
                            <span className="text-sm font-normal text-muted-foreground mx-1">
                                {summary.netBalance > 0 ? dict.Customers.Statement.Summary.DebitLabel : dict.Customers.Statement.Summary.CreditLabel}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {summary.netBalance > 0 ? dict.Customers.Statement.Summary.CollectFrom : dict.Customers.Statement.Summary.BalanceDue}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{dict.Suppliers.Statement.Table.Transactions}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">{dict.Suppliers.Statement.Table.Date}</TableHead>
                                <TableHead>{dict.Suppliers.Statement.Table.Type}</TableHead>
                                <TableHead>{dict.Suppliers.Statement.Table.Ref}</TableHead>
                                <TableHead>{dict.Suppliers.Statement.Table.Description}</TableHead>
                                <TableHead className="text-left text-blue-600">{dict.Suppliers.Statement.Table.Debit}</TableHead>
                                <TableHead className="text-left text-green-600">{dict.Suppliers.Statement.Table.Credit}</TableHead>
                                <TableHead className="text-left font-bold">{dict.Suppliers.Statement.Table.Balance}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Opening Balance */}
                            {customer.openingBalance !== 0 && (
                                <TableRow className="bg-muted/50">
                                    <TableCell>-</TableCell>
                                    <TableCell>رصيد افتتاحي</TableCell>
                                    <TableCell>-</TableCell>
                                    <TableCell>رصيد ما قبل الفترة</TableCell>
                                    <TableCell className="text-left font-mono">
                                        {Number(customer.openingBalance) > 0 ? formatCurrency(Number(customer.openingBalance)) : "-"}
                                    </TableCell>
                                    <TableCell className="text-left font-mono">
                                        {Number(customer.openingBalance) < 0 ? formatCurrency(Math.abs(Number(customer.openingBalance))) : "-"}
                                    </TableCell>
                                    <TableCell className="text-left font-mono font-bold">{formatCurrency(Number(customer.openingBalance))}</TableCell>
                                </TableRow>
                            )}

                            {transactions.map((t) => (
                                <TableRow key={t.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{format(t.date, "dd/MM/yyyy")}</span>
                                            <span className="text-xs text-muted-foreground">{format(t.date, "hh:mm a")}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${t.type === 'INVOICE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                            }`}>
                                            {t.type === 'INVOICE' ? 'فاتورة بيع' : 'سند قبض'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{t.ref}</TableCell>
                                    <TableCell className="max-w-[300px] truncate" title={t.description}>{t.description}</TableCell>
                                    <TableCell className="text-left font-mono text-blue-600">
                                        {t.debit > 0 ? formatCurrency(t.debit) : "-"}
                                    </TableCell>
                                    <TableCell className="text-left font-mono text-green-600">
                                        {t.credit > 0 ? formatCurrency(t.credit) : "-"}
                                    </TableCell>
                                    <TableCell className="text-left font-mono font-bold" dir="ltr">
                                        {formatCurrency(t.balance)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {transactions.length === 0 && customer.openingBalance === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        لا توجد حركات مسجلة لهذا العميل بعد.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
