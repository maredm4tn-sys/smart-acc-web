"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { openShift, closeShift, getShiftSummary } from "@/features/shifts/actions";
import { useShift } from "../context/shift-context";
import { toast } from "sonner";
import { Lock, Play, Printer } from "lucide-react";
import { ShiftReceipt } from "./shift-receipt";
import { useReactToPrint } from 'react-to-print';

export function ShiftManager() {
    const { activeShift, checkActiveShift } = useShift(); // Use global shift context
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'menu' | 'open' | 'close-count' | 'close-summary'>('menu');

    // Open Shift State
    const [startBalance, setStartBalance] = useState("0");

    // Close Shift State
    const [actualCash, setActualCash] = useState("");
    const [notes, setNotes] = useState("");
    const [summary, setSummary] = useState<any>(null);
    const [closingData, setClosingData] = useState<any>(null); // For receipt

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        onAfterPrint: () => resetState()
    });

    // Reset when dialog opens/closes
    useEffect(() => {
        if (isOpen) {
            setStep('menu');
            setStartBalance("0");
            setActualCash("");
            setNotes("");
            setSummary(null);

            // If no shift, go straight to open
            if (!activeShift) {
                setStep('open');
            }
        }
    }, [isOpen, activeShift]);

    const resetState = () => {
        setStep('menu');
        setIsOpen(false);
        checkActiveShift(); // Refresh context
    };

    const handleOpenShift = async () => {
        setLoading(true);
        try {
            const res = await openShift(Number(startBalance));
            if (res.success) {
                toast.success("تم فتح الوردية بنجاح");
                resetState();
            } else {
                toast.error(res.message);
            }
        } catch (e) {
            toast.error("حدث خطأ");
        } finally {
            setLoading(false);
        }
    };

    const prepareClose = async () => {
        setLoading(true);
        try {
            const data = await getShiftSummary(activeShift.id);
            setSummary(data);
            // Pre-fill actual cash with expected system cash for convenience (optional, maybe unsafe if we want strict count)
            // setActualCash((Number(activeShift.startBalance) + data.netCashMovement).toFixed(2));
            setStep('close-count');
        } catch (e) {
            toast.error("فشل تحميل ملخص الوردية");
        } finally {
            setLoading(false);
        }
    };

    const handleCloseShift = async () => {
        setLoading(true);
        try {
            const systemCash = Number(activeShift.startBalance || 0) + (summary?.netCashMovement || 0);
            const actual = Number(actualCash || 0);
            const diff = actual - systemCash;

            const res = await closeShift(activeShift.id, actual, notes);
            if (res.success) {
                toast.success("تم إغلاق الوردية");

                // Prepare Receipt Data
                setClosingData({
                    shiftId: activeShift.id,
                    shiftNumber: activeShift.shiftNumber,
                    startTime: activeShift.startTime,
                    endTime: new Date(),
                    cashierName: "Current User", // ideally from session
                    startBalance: Number(activeShift.startBalance || 0),
                    endBalance: actual,
                    expectedCash: systemCash,
                    cashSales: summary.cashSales,
                    visaSales: summary.visaSales,
                    unpaidSales: summary.unpaidSales,
                    expensesTotal: summary.payments, // Assuming payments are expenses/vouchers
                    difference: diff
                });

                setStep('close-summary');
                // Auto print check?
            } else {
                toast.error(res.message);
            }
        } catch (e) {
            toast.error("حدث خطأ أثناء الإغلاق");
        } finally {
            setLoading(false);
        }
    };

    if (step === 'close-summary' && closingData) {
        return (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>تقرير إغلاق الوردية</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center bg-gray-100 p-4 border rounded">
                        <ShiftReceipt ref={printRef} data={closingData} />
                    </div>
                    <DialogFooter>
                        <Button onClick={handlePrint} className="gap-2">
                            <Printer size={16} /> طباعة وإنهاء
                        </Button>
                        <Button variant="outline" onClick={resetState}>إغلاق</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant={activeShift ? "destructive" : "default"} size="sm" className="gap-2">
                    {activeShift ? <><Lock size={16} /> إغلاق الوردية #{activeShift.shiftNumber}</> : <><Play size={16} /> فتح وردية</>}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{activeShift ? `إغلاق الوردية #${activeShift.shiftNumber}` : "فتح وردية جديدة"}</DialogTitle>
                </DialogHeader>

                {step === 'open' && (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>رصيد البداية (العهدة)</Label>
                            <Input
                                type="number"
                                value={startBalance}
                                onChange={(e) => setStartBalance(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <Button onClick={handleOpenShift} disabled={loading} className="w-full">
                            {loading ? "جاري الفتح..." : "بدء الوردية"}
                        </Button>
                    </div>
                )}

                {step === 'menu' && activeShift && (
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
                            الوردية رقم #{activeShift.shiftNumber} مفتوحة منذ {new Date(activeShift.startTime).toLocaleTimeString()}
                        </div>
                        <Button onClick={prepareClose} disabled={loading} variant="destructive" className="w-full">
                            {loading ? "تحميل..." : "إنهاء الوردية وجرد الصندوق"}
                        </Button>
                    </div>
                )}

                {step === 'close-count' && summary && (
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                            <div className="bg-gray-50 p-2 rounded border">
                                <span className="block text-gray-500 text-xs">مبيعات نقدية</span>
                                <span className="font-bold">{Number(summary.cashSales).toFixed(2)}</span>
                            </div>
                            <div className="bg-gray-50 p-2 rounded border">
                                <span className="block text-gray-500 text-xs">مبيعات فيزا</span>
                                <span className="font-bold">{Number(summary.visaSales).toFixed(2)}</span>
                            </div>
                            <div className="bg-gray-50 p-2 rounded border">
                                <span className="block text-gray-500 text-xs">مصروفات/سدادات</span>
                                <span className="font-bold text-red-600">-{Number(summary.payments).toFixed(2)}</span>
                            </div>
                            <div className="bg-gray-50 p-2 rounded border">
                                <span className="block text-gray-500 text-xs">رصيد النظام المتوقع</span>
                                <span className="font-bold text-blue-600">
                                    {(Number(activeShift.startBalance || 0) + summary.netCashMovement).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>النقدية الفعلية بالدرج (Jرد)</Label>
                            <Input
                                type="number"
                                value={actualCash}
                                onChange={(e) => setActualCash(e.target.value)}
                                placeholder="أدخل المبلغ الموجود فعلياً"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>ملاحظات</Label>
                            <Input
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="أي عجز أو زيادة..."
                            />
                        </div>

                        {actualCash && (
                            <div className={`text-sm text-center font-bold p-2 rounded ${Number(actualCash) - (Number(activeShift.startBalance || 0) + summary.netCashMovement) === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                الفارق: {(Number(actualCash) - (Number(activeShift.startBalance || 0) + summary.netCashMovement)).toFixed(2)}
                            </div>
                        )}

                        <Button onClick={handleCloseShift} disabled={loading} variant="destructive" className="w-full">
                            {loading ? "جاري الإغلاق..." : "تأكيد الإغلاق وحفظ"}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
