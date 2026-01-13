
import React from 'react';
import { useTranslation } from '@/components/providers/i18n-provider';

export type ShiftReceiptData = {
    shiftId: number;
    shiftNumber: number;
    startTime: Date | string;
    endTime: Date | string;
    cashierName: string;
    startBalance: number;
    endBalance: number; // Actual Count
    expectedCash: number;
    cashSales: number;
    visaSales: number;
    unpaidSales: number; // Credit Sales
    returnsTotal: number;
    expensesTotal: number;
    difference: number;
};

export const ShiftReceipt = React.forwardRef<HTMLDivElement, { data: ShiftReceiptData | null }>(({ data }, ref) => {
    const { dict, lang } = useTranslation() as any;
    if (!data) return null;

    const formatDate = (date: Date | string) => {
        if (!date) return '-';
        return new Date(date).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div ref={ref} className="p-2 text-black font-mono text-[12px] leading-tight w-[80mm] mx-auto bg-white">
            <div className="text-center mb-4 border-b-2 border-dashed border-black pb-2">
                <h2 className="text-lg font-bold uppercase mb-1">{dict.Logo || "Smart Acc"}</h2>
                <h3 className="text-base font-bold bg-black text-white inline-block px-2 py-0.5 rounded-sm">
                    {dict.Shifts.CloseShiftTitle || "SHIFT REPORT (Z-REPORT)"}
                </h3>
            </div>

            <div className="mb-3 space-y-1 text-[11px]">
                <div className="flex justify-between">
                    <span className="font-bold">{dict.Shifts.ShiftNumber}:</span>
                    <span>#{data.shiftNumber}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-bold">{dict.Shifts.CurrentCashier}:</span>
                    <span>{data.cashierName}</span>
                </div>
                <div className="flex justify-between">
                    <span>{dict.Reports?.GeneralStatement?.FromDate || "Start"}:</span>
                    <span>{formatDate(data.startTime)}</span>
                </div>
                <div className="flex justify-between">
                    <span>{dict.Reports?.GeneralStatement?.ToDate || "End"}:</span>
                    <span>{formatDate(data.endTime)}</span>
                </div>
            </div>

            {/* Sales Summary */}
            <div className="border-t border-b border-black border-dashed py-2 mb-2 space-y-1">
                <h4 className="font-bold text-center mb-1 text-xs border-b border-gray-300 pb-1 w-2/3 mx-auto">
                    {dict.Reports?.Overview?.Today || "SALES SUMMARY"}
                </h4>

                <div className="flex justify-between">
                    <span>{dict.Shifts.SalesCash}:</span>
                    <span className="font-bold">{Number(data.cashSales).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>{dict.Shifts.SalesVisa}:</span>
                    <span className="font-bold">{Number(data.visaSales).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>{dict.Shifts.SalesUnpaid}:</span>
                    <span className="font-bold">{Number(data.unpaidSales).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                    <span>{dict.Reports?.Expenses?.Title || "Expenses"}:</span>
                    <span className="font-bold">-{Number(data.expensesTotal || 0).toFixed(2)}</span>
                </div>
            </div>

            {/* Cash Reconciliation */}
            <div className="mb-4 space-y-1.5 bg-gray-50 p-1 border border-gray-200">
                <div className="flex justify-between text-[10px] text-gray-600">
                    <span>{dict.Shifts.StartBalance}:</span>
                    <span>{Number(data.startBalance).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-300">
                    <span>{dict.Shifts.ExpectedCash}:</span>
                    <span>{Number(data.expectedCash).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm bg-black text-white px-1 py-0.5 mt-1">
                    <span>{dict.Shifts.ActualCash}:</span>
                    <span>{Number(data.endBalance).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1">
                    <span>{dict.Shifts.Difference}:</span>
                    <span className={data.difference < 0 ? "text-red-600" : "text-green-600"}>
                        {data.difference > 0 ? '+' : ''}{Number(data.difference).toFixed(2)}
                    </span>
                </div>
            </div>

            <div className="text-center text-[10px] mt-4 border-t border-black pt-2">
                <p>*** {dict.POS.PoweredBy || "Powered by Smart Acc"} ***</p>
                <p>{new Date().toLocaleString()}</p>
            </div>
        </div>
    );
});

ShiftReceipt.displayName = "ShiftReceipt";
