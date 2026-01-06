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
    const dict = await getDictionary(); // Assuming we might add translations later

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
                        المصروفات اليومية
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">تتبع وتسجيل جميع المصروفات والنثريات</p>
                </div>

                <AddExpenseDialog accounts={accountsList} />
            </div>

            {/* Monthly Summary */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-red-50/50 border-red-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-red-500" />
                            إجمالي مصروفات الشهر
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">{formatCurrency(data.monthlyTotal)}</div>
                        <p className="text-xs text-gray-400 mt-1">من أول الشهر الحالي حتى اليوم</p>
                    </CardContent>
                </Card>
            </div>

            {/* Expenses List */}
            <Card className="border-none shadow-md">
                <CardHeader>
                    <CardTitle className="text-lg">آخر العمليات المسجلة</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead className="text-right w-[120px]">التاريخ</TableHead>
                                    <TableHead className="text-right">بند المصروف</TableHead>
                                    <TableHead className="text-right">الوصف</TableHead>
                                    <TableHead className="text-right">المبلغ</TableHead>
                                    <TableHead className="text-right w-[100px]">رقم القيد</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.expenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                                            لا توجد مصروفات مسجلة حتى الآن.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.expenses.map((expense) => (
                                        <TableRow key={expense.id}>
                                            <TableCell className="font-medium text-gray-600">
                                                {new Date(expense.date).toLocaleDateString('en-GB')}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                    {expense.accountName}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-gray-500">{expense.description}</TableCell>
                                            <TableCell className="font-bold text-red-600">
                                                {formatCurrency(expense.amount)}
                                            </TableCell>
                                            <TableCell className="text-xs text-gray-400 font-mono">
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
