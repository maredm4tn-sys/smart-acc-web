import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Wallet } from "lucide-react";
import { AddExpenseDialog } from "./add-expense-dialog";
import { getExpenseAccounts, getExpensesList } from "@/features/accounting/actions";
import { getDictionary } from "@/lib/i18n-server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function ExpensesPage() {
    // Fetch expense accounts for the dropdown
    const accountsList = await getExpenseAccounts();
    const rawDict = await getDictionary();
    const dict = rawDict as any;

    const data = await getExpensesList();

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EGP'
        }).format(val);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Wallet className="text-red-500" />
                        {dict.Expenses.Title}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">{dict.Expenses.Description}</p>
                </div>

                <AddExpenseDialog accounts={accountsList} />
            </div>

            {/* Monthly Summary */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-red-50/50 border-red-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-red-500" />
                            {dict.Expenses.Summary.TotalMonthly}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">{formatCurrency(data.monthlyTotal)}</div>
                        <p className="text-xs text-gray-400 mt-1">{dict.Expenses.Summary.MonthToDate}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Expenses List */}
            <Card className="border-none shadow-md">
                <CardHeader>
                    <CardTitle className="text-lg">{dict.Expenses.LatestTransactions}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead className="w-[120px] text-center">{dict.Expenses.Table.Date}</TableHead>
                                    <TableHead className="text-start">{dict.Expenses.Table.Account}</TableHead>
                                    <TableHead className="text-start">{dict.Expenses.Table.Description}</TableHead>
                                    <TableHead className="text-end">{dict.Expenses.Table.Amount}</TableHead>
                                    <TableHead className="w-[150px] text-end">{dict.Expenses.Table.EntryNo}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.expenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                                            {dict.Expenses.Table.NoExpenses}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.expenses.map((expense) => (
                                        <TableRow key={expense.id}>
                                            <TableCell className="font-medium text-gray-600 text-center">
                                                {new Date(expense.date).toLocaleDateString('en-GB')}
                                            </TableCell>
                                            <TableCell className="text-start">
                                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                    {expense.accountName}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-gray-500 text-start">{expense.description}</TableCell>
                                            <TableCell className="font-bold text-red-600 text-end">
                                                {formatCurrency(expense.amount)}
                                            </TableCell>
                                            <TableCell className="text-xs text-gray-400 font-mono text-end">
                                                {expense.entryNumber}
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
    );
}
