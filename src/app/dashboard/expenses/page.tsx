import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Wallet } from "lucide-react";
import { AddExpenseDialog } from "./add-expense-dialog";
import { getExpenseAccounts, getExpensesList } from "@/features/accounting/actions";
import { getDictionary } from "@/lib/i18n-server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default async function ExpensesPage() {
    // Fetch expense accounts for the dropdown
    const accountsList = await getExpenseAccounts();
    const rawDict = await getDictionary();
    const dict = rawDict as any;

    const data = await getExpensesList();


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                        <Wallet className="text-red-500" />
                        {dict.Expenses.Title}
                    </h1>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">{dict.Expenses.Description}</p>
                </div>

                <div className="w-full sm:w-auto">
                    <AddExpenseDialog accounts={accountsList} />
                </div>
            </div>

            {/* Monthly Summary */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-red-50/50 border-red-100 shadow-sm">
                    <CardHeader className="pb-2 p-4">
                        <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-red-500" />
                            {dict.Expenses.Summary.TotalMonthly}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-red-700">{formatCurrency(data.monthlyTotal)}</div>
                        <p className="text-xs text-gray-400 mt-1">{dict.Expenses.Summary.MonthToDate}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Expenses List */}
            <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{dict.Expenses.LatestTransactions}</CardTitle>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    <div className="rt-table-container">
                        <table className="rt-table">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="w-[120px] text-center">{dict.Expenses.Table.Date}</th>
                                    <th className="text-start">{dict.Expenses.Table.Account}</th>
                                    <th className="text-start">{dict.Expenses.Table.Description}</th>
                                    <th className="text-end">{dict.Expenses.Table.Amount}</th>
                                    <th className="w-[150px] text-end">{dict.Expenses.Table.EntryNo}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.expenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12 text-gray-500">
                                            {dict.Expenses.Table.NoExpenses}
                                        </td>
                                    </tr>
                                ) : (
                                    data.expenses.map((expense) => (
                                        <tr key={expense.id}>
                                            <td data-label={dict.Expenses.Table.Date} className="font-medium text-gray-600 text-center">
                                                {new Date(expense.date).toLocaleDateString('en-GB')}
                                            </td>
                                            <td data-label={dict.Expenses.Table.Account} className="text-start">
                                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                    {expense.accountName}
                                                </Badge>
                                            </td>
                                            <td data-label={dict.Expenses.Table.Description} className="text-gray-500 text-start">{expense.description}</td>
                                            <td data-label={dict.Expenses.Table.Amount} className="font-bold text-red-600 text-end">
                                                {formatCurrency(expense.amount)}
                                            </td>
                                            <td data-label={dict.Expenses.Table.EntryNo} className="text-xs text-gray-400 font-mono text-end">
                                                {expense.entryNumber}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>

    );
}
