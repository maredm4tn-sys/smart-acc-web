
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCustomerStatement, getAccountStatement, StatementEntry } from "@/features/reports/statement-actions";
import { useReactToPrint } from "react-to-print";
import { Loader2, Printer, Search } from "lucide-react";
import { toast } from "sonner";

// Simple Internal Entity Select Component
function EntitySelect({ type, value, onChange }: { type: string, value: number | null, onChange: (val: number) => void }) {
    const [list, setList] = useState<{ id: number; name: string }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchList = async () => {
            setLoading(true);
            try {
                let url = "";
                if (type === 'customer') url = "/api/customers";
                else if (type === 'supplier') url = "/api/suppliers";
                else if (type === 'treasury') url = "/api/accounts?type=asset";
                else if (type === 'expense') url = "/api/accounts?type=expense";
                else url = `/api/accounts?type=${type}`;

                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setList(data.success ? data.data : (Array.isArray(data) ? data : []));
                } else {
                    setList([]);
                }
            } catch (e) {
                setList([]);
            } finally {
                setLoading(false);
            }
        };
        fetchList();
    }, [type]);

    return (
        <Select value={value?.toString()} onValueChange={(v) => onChange(Number(v))}>
            <SelectTrigger>
                <SelectValue placeholder={loading ? "جاري التحميل..." : "اختر الحساب/الجهة..."} />
            </SelectTrigger>
            <SelectContent>
                {list.map((item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name}
                    </SelectItem>
                ))}
                {!loading && list.length === 0 && (
                    <div className="p-2 text-sm text-gray-500 text-center">لا توجد بيانات</div>
                )}
            </SelectContent>
        </Select>
    );
}

export default function StatementPage() {
    const [type, setType] = useState<string>('customer');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<{ statement: StatementEntry[], entity: any, openingBalance: number, closingBalance: number } | null>(null);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Statement-${type}-${selectedId}`,
    });

    const handleSearch = async () => {
        if (!selectedId) {
            toast.error("الرجاء اختيار الحساب");
            return;
        }
        setLoading(true);
        try {
            let result;
            if (type === 'customer' || type === 'supplier') {
                result = await getCustomerStatement(type as any, selectedId, new Date(startDate), new Date(endDate));
            } else {
                result = await getAccountStatement(selectedId, new Date(startDate), new Date(endDate));
            }
            setData(result);
        } catch (e: any) {
            console.error(e);
            toast.error("فشل في جلب كشف الحساب: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>}>
            <StatementContent
                type={type}
                setType={setType}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                loading={loading}
                data={data}
                setData={setData}
                handleSearch={handleSearch}
                handlePrint={handlePrint}
                printRef={printRef}
            />
        </Suspense>
    );
}

function StatementContent({
    type, setType, selectedId, setSelectedId, startDate, setStartDate, endDate, setEndDate,
    loading, data, setData, handleSearch, handlePrint, printRef
}: any) {
    const searchParams = useSearchParams();

    useEffect(() => {
        const searchVal = searchParams.get('search');
        if (searchVal) {
            if (searchVal === 'customers') setType('customer');
            else if (searchVal === 'suppliers') setType('supplier');
            else if (searchVal === 'cash' || searchVal === 'banks') setType('treasury');
            else if (searchVal === 'expenses') setType('expense');
            setSelectedId(null);
            setData(null);
        }
    }, [searchParams, setType, setSelectedId, setData]);

    const getReportTitle = () => {
        switch (type) {
            case 'customer': return 'كشف حساب عميل';
            case 'supplier': return 'كشف حساب مورد';
            case 'treasury': return 'كشف حركة نقدية/بنك';
            case 'expense': return 'تحليل مصروفات';
            default: return 'كشف حساب عام';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">كشف حساب تفصيلي</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>خيارات التقرير</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>نوع التقرير</Label>
                            <Select value={type} onValueChange={(v: string) => { setType(v); setSelectedId(null); setData(null); }}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="customer">العملاء</SelectItem>
                                    <SelectItem value="supplier">الموردين</SelectItem>
                                    <SelectItem value="treasury">الخزينة والبنوك</SelectItem>
                                    <SelectItem value="expense">المصروفات</SelectItem>
                                    <SelectItem value="revenue">الإيرادات الأخرى</SelectItem>
                                    <SelectItem value="equity">رأس المال وحقوق الملكية</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>اختر الحساب</Label>
                            <EntitySelect type={type} value={selectedId} onChange={setSelectedId} />
                        </div>

                        <div className="space-y-2">
                            <Label>من تاريخ</Label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label>إلى تاريخ</Label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <Button onClick={handleSearch} disabled={loading || !selectedId}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            <Search className="w-4 h-4 ml-2" />
                            عرض التقرير
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {data && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={handlePrint}>
                            <Printer className="w-4 h-4 ml-2" />
                            طباعة الكشف
                        </Button>
                    </div>

                    <div className="border rounded-lg bg-white p-8 shadow-sm" ref={printRef}>
                        {/* Print Header */}
                        <div className="text-center mb-8 border-b pb-4">
                            <h2 className="text-2xl font-bold mb-2">{getReportTitle()}</h2>
                            <h3 className="text-xl text-blue-600 font-semibold">{data.entity?.name} <span className="text-sm text-gray-400">({data.entity?.code || '-'})</span></h3>
                            <p className="text-gray-500 mt-2">
                                الفترة من {startDate} إلى {endDate}
                            </p>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-4 mb-8 text-center">
                            <div className="bg-gray-50 p-4 rounded border">
                                <div className="text-sm text-gray-500">الرصيد الافتتاحي</div>
                                <div className="text-lg font-bold">{data.openingBalance.toFixed(2)}</div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded border">
                                <div className="text-sm text-gray-500">حركة الفترة (صافي)</div>
                                <div className={`text-lg font-bold ${data.closingBalance - data.openingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {(data.closingBalance - data.openingBalance).toFixed(2)}
                                </div>
                            </div>
                            <div className="bg-blue-50 p-4 rounded border border-blue-100">
                                <div className="text-sm text-blue-600">الرصيد الختامي</div>
                                <div className="text-2xl font-bold text-blue-700 dir-ltr text-center">{data.closingBalance.toFixed(2)}</div>
                            </div>
                        </div>

                        {/* Statement Table */}
                        <table className="w-full text-sm text-right border-collapse">
                            <thead>
                                <tr className="bg-gray-100 border-b border-gray-200">
                                    <th className="py-3 px-2 border">التاريخ</th>
                                    <th className="py-3 px-2 border">البيان / الوصف</th>
                                    <th className="py-3 px-2 border">رقم المرجع</th>
                                    <th className="py-3 px-2 border">مدين</th>
                                    <th className="py-3 px-2 border">دائن</th>
                                    <th className="py-3 px-2 border bg-gray-50">الرصيد</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.statement.map((row: any, idx: number) => (
                                    <tr key={idx} className={`border-b border-gray-100 ${row.type === 'OPENING' ? 'bg-yellow-50 font-medium' : 'hover:bg-gray-50'}`}>
                                        <td className="py-2 px-2 border whitespace-nowrap">
                                            {new Date(row.date).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="py-2 px-2 border">{row.description}</td>
                                        <td className="py-2 px-2 border font-mono text-xs">{row.reference || '-'}</td>
                                        <td className="py-2 px-2 border text-gray-600">
                                            {row.debit > 0 ? row.debit.toFixed(2) : '-'}
                                        </td>
                                        <td className="py-2 px-2 border text-gray-600">
                                            {row.credit > 0 ? row.credit.toFixed(2) : '-'}
                                        </td>
                                        <td className="py-2 px-2 border bg-gray-50 font-semibold dir-ltr text-left">
                                            {row.balance.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="mt-8 text-xs text-center text-gray-400">
                            تم استخراج هذا التقرير من نظام المحاسب الذكي بتاريخ {new Date().toLocaleString('ar-EG')}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
