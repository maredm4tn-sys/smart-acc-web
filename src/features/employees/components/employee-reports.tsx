"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Search, Printer } from "lucide-react";
import { getEmployeeStatement } from "@/features/employees/actions";

export function EmployeeReports({ employees, dict }: { employees: any[], dict: any }) {
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState("all");

    const handleSearch = async () => {
        if (!selectedEmployee) return;
        setLoading(true);
        const res = await getEmployeeStatement(parseInt(selectedEmployee), startDate, endDate);
        setData(res);
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-sm">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>{dict.Employees.Table.Name}</Label>
                            <Select onValueChange={setSelectedEmployee}>
                                <SelectTrigger>
                                    <SelectValue placeholder={dict.Payroll.SelectEmployee} />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.IncomeStatement?.FromDate || "From"}</Label>
                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Reports.Type}</Label>
                            <Select value={reportType} onValueChange={setReportType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{dict.Common.All}</SelectItem>
                                    <SelectItem value="payroll">{dict.Employees.Tabs.Payroll}</SelectItem>
                                    <SelectItem value="advances">{dict.Employees.Tabs.Advances}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.IncomeStatement?.ToDate || "To"}</Label>
                            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                        <Button className="gap-2 h-10" onClick={handleSearch} disabled={loading}>
                            <Search size={18} />
                            {dict.IncomeStatement?.ShowReport || "View Report"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {data && (
                <Card className="border-none shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-blue-600" />
                            {dict.Reports.Statements.Employees}
                        </CardTitle>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                            <Printer size={16} />
                            {dict.GeneralStatement?.Print || "Print"}
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-8">
                        {/* Payrolls Summary */}
                        {(reportType === 'all' || reportType === 'payroll') && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2 border-r-4 border-blue-500 pr-2">{dict.Employees?.Tabs?.Payroll || "سجلات الرواتب المنصرفة"}</h3>
                                <div className="rounded-md border overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead className="text-center">{dict.Journal.Table.Date}</TableHead>
                                                <TableHead className="text-center">{dict.Payroll.Month}</TableHead>
                                                <TableHead className="text-center">{dict.Payroll.Basic}</TableHead>
                                                <TableHead className="text-center">{dict.Payroll.Incentives}</TableHead>
                                                <TableHead className="text-center">{dict.Payroll.Deductions}</TableHead>
                                                <TableHead className="text-center">{dict.Payroll.AdvanceDed}</TableHead>
                                                <TableHead className="text-center font-bold">{dict.Payroll.Net}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.payrolls.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center h-12 text-slate-400">{dict.Reports.NoData}</TableCell>
                                                </TableRow>
                                            ) : (
                                                data.payrolls.map((p: any) => (
                                                    <TableRow key={p.id}>
                                                        <TableCell className="text-center font-mono text-xs">{p.paymentDate}</TableCell>
                                                        <TableCell className="text-center font-bold">{p.salaryMonth}</TableCell>
                                                        <TableCell className="text-center">{Number(p.basicSalary).toFixed(2)}</TableCell>
                                                        <TableCell className="text-center text-green-600">+{Number(p.incentives).toFixed(2)}</TableCell>
                                                        <TableCell className="text-center text-red-500">-{Number(p.deductions).toFixed(2)}</TableCell>
                                                        <TableCell className="text-center text-orange-600">-{Number(p.advanceDeductions).toFixed(2)}</TableCell>
                                                        <TableCell className="text-center font-bold text-blue-700">{Number(p.netSalary).toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {/* Advances Summary */}
                        {(reportType === 'all' || reportType === 'advances') && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2 border-r-4 border-orange-500 pr-2">{dict.Employees?.Tabs?.Advances || "سجلات السلف والقروض"}</h3>
                                <div className="rounded-md border overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead className="text-center">{dict.Journal.Table.Date}</TableHead>
                                                <TableHead className="text-center">{dict.Advances.Type}</TableHead>
                                                <TableHead className="text-center">{dict.Advances.Amount}</TableHead>
                                                <TableHead className="text-center">{dict.Advances.Month}</TableHead>
                                                <TableHead className="text-center">{dict.Employees.Table.Status}</TableHead>
                                                <TableHead className="text-center">{dict.Payroll.Notes}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.advances.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center h-12 text-slate-400">{(dict as any).Reports?.NoData || "لا يوجد سجلات سلف في هذه الفترة"}</TableCell>
                                                </TableRow>
                                            ) : (
                                                data.advances.map((a: any) => (
                                                    <TableRow key={a.id}>
                                                        <TableCell className="text-center font-mono text-xs">{a.date}</TableCell>
                                                        <TableCell className="text-center">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${a.type === 'advance' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                                                {a.type === 'advance' ? (dict.Advances?.Types?.Advance || 'صرف سلفة') : (dict.Advances?.Types?.Repayment || 'استرداد نقدي')}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className={`text-center font-bold ${a.type === 'advance' ? 'text-orange-700' : 'text-green-700'}`}>{Number(a.amount).toFixed(2)}</TableCell>
                                                        <TableCell className="text-center">{a.salaryMonth}</TableCell>
                                                        <TableCell className="text-center">
                                                            <span className={`text-[10px] ${a.status === 'deducted' ? 'text-gray-400' : 'text-blue-600 font-bold'}`}>
                                                                {a.status === 'deducted' ? (dict.Advances?.Status?.Deducted || 'تم الخصم') : (dict.Advances?.Status?.Pending || 'رصيد مفتوح')}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center text-xs text-slate-400">{a.notes || "-"}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
