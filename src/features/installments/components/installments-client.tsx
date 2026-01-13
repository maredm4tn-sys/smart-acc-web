"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, Search, CheckCircle2, AlertCircle, Clock, Wallet } from "lucide-react";
import { payInstallment } from "../actions";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function InstallmentsClient({ initialData, dict }: { initialData: any[], dict: any }) {
    const [installments, setInstallments] = useState(initialData);
    const [search, setSearch] = useState("");

    const filtered = installments.filter(inst =>
        inst.customerName.toLowerCase().includes(search.toLowerCase()) ||
        inst.invoiceNumber.toLowerCase().includes(search.toLowerCase())
    );

    const handlePay = async (id: number) => {
        const confirm = window.confirm(dict.Confirm?.Message || "هل أنت متأكد من تسجيل استلام هذا القسط؟");
        if (!confirm) return;

        const res = await payInstallment(id, new Date().toISOString().split('T')[0]);
        if (res.success) {
            toast.success(dict.Installments?.Success || "تم تحصيل القسط بنجاح");
            setInstallments(prev => prev.map(inst =>
                inst.id === id ? { ...inst, status: 'paid', amountPaid: inst.amount, paidDate: new Date().toISOString().split('T')[0] } : inst
            ));
        } else {
            toast.error(res.message);
        }
    };

    const dueThisMonth = filtered.filter(inst => {
        const now = new Date();
        const due = new Date(inst.dueDate);
        return due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear() && inst.status !== 'paid';
    });

    const totalDueThisMonth = dueThisMonth.reduce((sum, inst) => sum + Number(inst.amount), 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                            <Clock size={16} />
                            {(dict as any).Installments?.Status?.Due || "أقساط مستحقة هذا الشهر"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">{dueThisMonth.length}</div>
                        <p className="text-xs text-blue-500 mt-1">{(dict as any).Installments?.Status?.Count || "عدد الأقساط المطلوب تحصيلها"}</p>
                    </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-2">
                            <Wallet size={16} />
                            {(dict as any).Installments?.Status?.Total || "إجمالي مبالغ التحصيل"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-900">{totalDueThisMonth.toFixed(2)} <span className="text-sm">EGP</span></div>
                        <p className="text-xs text-orange-500 mt-1">{(dict as any).Installments?.Status?.MonthLabel || "المستحق خلال شهر"}</p>
                    </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                            <CheckCircle2 size={16} />
                            {(dict as any).Installments?.Status?.CommitmentRate || "معدل الالتزام"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-900">
                            {initialData.length > 0 ? Math.round((initialData.filter(i => i.status === 'paid').length / initialData.length) * 100) : 0}%
                        </div>
                        <p className="text-xs text-green-500 mt-1">{(dict as any).Installments?.Status?.CommitmentDesc || "نسبة الأقساط المحصلة من الإجمالي"}</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="all" className="w-full">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                    <TabsList>
                        <TabsTrigger value="all">{dict.Common?.All || "كل الأقساط"}</TabsTrigger>
                        <TabsTrigger value="due">{(dict as any).Installments?.Table?.Unpaid || "المتأخرة والمستحقة"}</TabsTrigger>
                        <TabsTrigger value="paid">{(dict as any).Installments?.Table?.Paid || "المحصلة"}</TabsTrigger>
                    </TabsList>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <Input
                            placeholder={(dict as any).Installments?.SearchPlaceholder || "بحث..."}
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <TabsContent value="all">
                    <InstallmentTable data={filtered} onPay={handlePay} dict={dict} />
                </TabsContent>
                <TabsContent value="due">
                    <InstallmentTable data={filtered.filter(i => i.status !== 'paid')} onPay={handlePay} dict={dict} />
                </TabsContent>
                <TabsContent value="paid">
                    <InstallmentTable data={filtered.filter(i => i.status === 'paid')} onPay={handlePay} dict={dict} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function InstallmentTable({ data, onPay, dict }: { data: any[], onPay: (id: number) => void, dict: any }) {
    return (
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-right">{(dict as any).Installments?.Table?.Customer || "العميل"}</TableHead>
                        <TableHead className="text-center">{(dict as any).Installments?.Table?.Invoice || "رقم الفاتورة"}</TableHead>
                        <TableHead className="text-center">{(dict as any).Installments?.Table?.DueDate || "تاريخ الاستحقاق"}</TableHead>
                        <TableHead className="text-center">{(dict as any).Installments?.Table?.Amount || "المبلغ"}</TableHead>
                        <TableHead className="text-center">{(dict as any).Installments?.Table?.Status || "الحالة"}</TableHead>
                        <TableHead className="text-left">{(dict as any).Installments?.Table?.Actions || "الإجراء"}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-10 text-gray-400">{dict.Installments?.NoInstallments || "لا توجد سجلات حالياً"}</TableCell>
                        </TableRow>
                    ) : (
                        data.map((inst) => (
                            <TableRow key={inst.id}>
                                <TableCell className="font-bold">{inst.customerName}</TableCell>
                                <TableCell className="text-center text-blue-600 font-mono text-xs cursor-pointer hover:underline">
                                    {inst.invoiceNumber}
                                </TableCell>
                                <TableCell className="text-center font-mono">{inst.dueDate}</TableCell>
                                <TableCell className="text-center font-bold">{Number(inst.amount).toFixed(2)}</TableCell>
                                <TableCell className="text-center">
                                    {inst.status === 'paid' ? (
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">{(dict as any).Installments?.Table?.Paid || "تم الدفع"}</Badge>
                                    ) : new Date(inst.dueDate) < new Date() ? (
                                        <Badge variant="destructive" className="flex items-center gap-1 mx-auto w-fit">
                                            <AlertCircle size={10} />
                                            {(dict as any).Installments?.Table?.Overdue || "متأخر"}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-gray-500">{(dict as any).Installments?.Table?.Upcoming || "قادم"}</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-left">
                                    {inst.status !== 'paid' && (
                                        <Button size="sm" onClick={() => onPay(inst.id)} className="bg-green-600 hover:bg-green-700 gap-1 h-8">
                                            {dict.Installments?.Pay || "تحصيل"}
                                        </Button>
                                    )}
                                    {inst.status === 'paid' && (
                                        <span className="text-xs text-green-600 font-medium">
                                            {(dict as any).Installments?.PaidOn || "بتاريخ"} {inst.paidDate}
                                        </span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Card>
    );
}
