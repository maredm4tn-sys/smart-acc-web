
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
import { formatNumber } from "@/lib/utils";
import { useTranslation } from "@/components/providers/i18n-provider";

// Simple Internal Entity Select Component
function EntitySelect({ type, value, onChange }: { type: string, value: number | null, onChange: (val: number) => void }) {
    const { dict } = useTranslation();
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
                <SelectValue placeholder={loading ? dict.Reports.GeneralStatement.Loading : dict.Reports.GeneralStatement.SelectPlaceholder} />
            </SelectTrigger>
            <SelectContent>
                {list.map((item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name}
                    </SelectItem>
                ))}
                {!loading && list.length === 0 && (
                    <div className="p-2 text-sm text-gray-500 text-center">{dict.Reports.GeneralStatement.NoData}</div>
                )}
            </SelectContent>
        </Select>
    );
}

export default function StatementPage() {
    const { dict, lang } = useTranslation() as any;
    const [type, setType] = useState<string>('customer');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const today = new Date();
    const currentYear = today.getFullYear();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState<string>(`${currentYear}-01-01`);
    const [endDate, setEndDate] = useState<string>(lastDayOfMonth.toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<{ statement: StatementEntry[], entity: any, openingBalance: number, closingBalance: number } | null>(null);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Statement-${type}-${selectedId}`,
    });

    const handleSearch = async () => {
        if (!selectedId) {
            toast.error(dict.Reports.GeneralStatement.Errors.SelectAccount);
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
            toast.error(dict.Reports.GeneralStatement.Errors.FetchFailed + ": " + e.message);
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
    const { dict, lang } = useTranslation();
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
        const titles = dict.Reports.GeneralStatement.ReportTitles;
        switch (type) {
            case 'customer': return titles.Customer;
            case 'supplier': return titles.Supplier;
            case 'treasury': return titles.Treasury;
            case 'expense': return titles.Expense;
            default: return titles.General;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">{dict.Reports.GeneralStatement.Title}</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{dict.Reports.GeneralStatement.Options}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>{dict.Reports.GeneralStatement.Type}</Label>
                            <Select value={type} onValueChange={(v: string) => { setType(v); setSelectedId(null); setData(null); }}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="customer">{dict.Reports.GeneralStatement.Types.Customer}</SelectItem>
                                    <SelectItem value="supplier">{dict.Reports.GeneralStatement.Types.Supplier}</SelectItem>
                                    <SelectItem value="treasury">{dict.Reports.GeneralStatement.Types.Treasury}</SelectItem>
                                    <SelectItem value="expense">{dict.Reports.GeneralStatement.Types.Expense}</SelectItem>
                                    <SelectItem value="revenue">{dict.Reports.GeneralStatement.Types.Revenue}</SelectItem>
                                    <SelectItem value="equity">{dict.Reports.GeneralStatement.Types.Equity}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>{dict.Reports.GeneralStatement.Account}</Label>
                            <EntitySelect type={type} value={selectedId} onChange={setSelectedId} />
                        </div>

                        <div className="space-y-2">
                            <Label>{dict.Reports.GeneralStatement.FromDate}</Label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label>{dict.Reports.GeneralStatement.ToDate}</Label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <Button onClick={handleSearch} disabled={loading || !selectedId}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            <Search className="w-4 h-4 ml-2" />
                            {dict.Reports.GeneralStatement.ShowReport}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {data && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={handlePrint}>
                            <Printer className="w-4 h-4 ml-2" />
                            {dict.Reports.GeneralStatement.Print}
                        </Button>
                    </div>

                    <div className="border rounded-lg bg-white p-8 shadow-sm" ref={printRef}>
                        {/* Print Header */}
                        <div className="text-center mb-8 border-b pb-4">
                            <h2 className="text-2xl font-bold mb-2">{getReportTitle()}</h2>
                            <h3 className="text-xl text-blue-600 font-semibold">{data.entity?.name} <span className="text-sm text-gray-400">({data.entity?.code || '-'})</span></h3>
                            <p className="text-gray-500 mt-2">
                                {lang === 'ar' ? `الفترة من ${startDate} إلى ${endDate}` : `Period from ${startDate} to ${endDate}`}
                            </p>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-4 mb-8 text-center">
                            <div className="bg-gray-50 p-4 rounded border">
                                <div className="text-sm text-gray-500">{dict.Reports.GeneralStatement.OpeningBalance}</div>
                                <div className="text-lg font-bold">{formatNumber(data.openingBalance)}</div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded border">
                                <div className="text-sm text-gray-500">{dict.Reports.GeneralStatement.PeriodMotion}</div>
                                <div className={`text-lg font-bold ${data.closingBalance - data.openingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatNumber(data.closingBalance - data.openingBalance)}
                                </div>
                            </div>
                            <div className="bg-blue-50 p-4 rounded border border-blue-100">
                                <div className="text-sm text-blue-600">{dict.Reports.GeneralStatement.ClosingBalance}</div>
                                <div className="text-2xl font-bold text-blue-700 dir-ltr text-center">{formatNumber(data.closingBalance)}</div>
                            </div>
                        </div>

                        {/* Statement Table */}
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-100 border-b border-gray-200">
                                    <th className="py-3 px-2 border text-start">{dict.Reports.GeneralStatement.Table.Date}</th>
                                    <th className="py-3 px-2 border text-start">{dict.Reports.GeneralStatement.Table.Description}</th>
                                    <th className="py-3 px-2 border text-start">{dict.Reports.GeneralStatement.Table.Reference}</th>
                                    <th className="py-3 px-2 border text-end">{dict.Reports.GeneralStatement.Table.Debit}</th>
                                    <th className="py-3 px-2 border text-end">{dict.Reports.GeneralStatement.Table.Credit}</th>
                                    <th className="py-3 px-2 border bg-gray-50 text-end">{dict.Reports.GeneralStatement.Table.Balance}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.statement.map((row: any, idx: number) => (
                                    <tr key={idx} className={`border-b border-gray-100 ${row.type === 'OPENING' ? 'bg-yellow-50 font-medium' : 'hover:bg-gray-50'}`}>
                                        <td className="py-2 px-2 border text-start whitespace-nowrap">
                                            {new Date(row.date).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="py-2 px-2 border text-start font-medium">
                                            {row.description}
                                        </td>
                                        <td className="py-2 px-2 border text-start font-mono text-xs">{row.reference || '-'}</td>
                                        <td className="py-2 px-2 border text-end text-gray-800 font-bold dir-ltr">
                                            {row.debit > 0 ? formatNumber(row.debit) : '-'}
                                        </td>
                                        <td className="py-2 px-2 border text-end text-gray-800 font-bold dir-ltr">
                                            {row.credit > 0 ? formatNumber(row.credit) : '-'}
                                        </td>
                                        <td className={`py-2 px-2 border bg-gray-50 font-bold text-end dir-ltr ${row.balance < 0 ? 'text-red-700' : 'text-blue-700'}`}>
                                            {formatNumber(row.balance)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Installment Schedule (New Section) */}
                        {type === 'customer' && data.installments && data.installments.length > 0 && (
                            <div className="mt-10">
                                <h3 className="text-lg font-bold text-blue-800 border-b-2 border-blue-100 pb-2 mb-4 flex items-center gap-2">
                                    📑 جدول الأقساط المتبقية
                                </h3>
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-blue-50">
                                            <th className="py-2 px-2 border border-blue-100 text-start">تاريخ الاستحقاق</th>
                                            <th className="py-2 px-2 border border-blue-100 text-start">الفاتورة</th>
                                            <th className="py-2 px-2 border border-blue-100 text-end">المبلغ</th>
                                            <th className="py-2 px-2 border border-blue-100 text-center">الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.installments.map((inst: any, i: number) => (
                                            <tr key={i} className={inst.status === 'paid' ? 'bg-green-50/30' : ''}>
                                                <td className="py-2 px-2 border border-blue-50 text-start">{inst.dueDate}</td>
                                                <td className="py-2 px-2 border border-blue-50 text-start font-mono text-[10px]">{inst.invoiceNumber}</td>
                                                <td className="py-2 px-2 border border-blue-50 text-end font-bold text-blue-900">{formatNumber(inst.amount)} EGP</td>
                                                <td className="py-2 px-2 border border-blue-50 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${inst.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {inst.status === 'paid' ? 'تم التحصيل' : 'مستحق'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-blue-800 text-[11px] font-medium">
                                    * ملاحظة: يتم تحديث جدول الأقساط تلقائياً عند تسجيل أي دفعة جديدة.
                                </div>
                            </div>
                        )}

                        <div className="mt-8 text-xs text-center text-gray-400">
                            {dict.Reports.GeneralStatement.Footer.replace('{date}', new Date().toLocaleString('en-US'))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

