"use client";

import { usePOS } from "../context/pos-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, CreditCard, Banknote, Building2 } from "lucide-react";
import { useState, useEffect } from "react";

export function POSFooter() {
    const { totals, setTotals, checkout, isLoading, header, setHeader, settings, setSettings, clearCart } = usePOS();

    // Local state for auto print
    const [autoPrint, setAutoPrint] = useState(true);

    // Tax Toggle Handler
    const handleTaxChange = (checked: boolean) => {
        setTotals({ taxRate: checked ? 14 : 0 });
    };

    // Checkout wrapper with auto-print
    const handleCheckout = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        const result = await checkout();
        if (result && result.success) {
            // 1. Trigger Printing using window.open (More reliable for modern browsers)
            if (autoPrint) {
                const layoutType = settings.printLayout || 'thermal';
                const printUrl = `/print/sales/${result.id}?type=${layoutType}&auto=true&t=${Date.now()}`;

                // Open a small hidden-like window
                const printWindow = window.open(printUrl, 'pos_print_window', 'width=400,height=600,left=1000,top=1000');
                // The print window now handles its own closing via 'afterprint' listener
            }

            // 2. Delayed Cleanup (Wait for print dialog to potentially open)
            setTimeout(() => {
                clearCart();
                setHeader({ customerId: 0, customerName: "", paymentMethod: 'cash', priceType: 'retail' });
                setTotals({ paid: 0, discountAmount: 0, discountPercent: 0, deliveryFee: 0 });
            }, 1500);
        }
    };

    return (
        <div className="bg-white border-t p-3 flex flex-col gap-2 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-20 no-print">

            {/* Subtotal Row */}
            <div className="flex justify-between items-center text-slate-500 font-bold">
                <span className="text-sm font-mono">{totals.subtotal.toFixed(2)}</span>
                <span className="text-[11px]">المجموع الفرعي</span>
            </div>

            {/* Conditional Tax Row */}
            {totals.taxRate > 0 && (
                <div className="flex justify-between items-center text-orange-600 font-bold animate-in fade-in slide-in-from-top-1 duration-200">
                    <span className="text-sm font-mono">+{((totals.subtotal - totals.discountAmount) * (totals.taxRate / 100)).toFixed(2)}</span>
                    <span className="text-[10px]">الضريبة ({totals.taxRate}%)</span>
                </div>
            )}

            {/* Conditional Discount Row */}
            {totals.discountAmount > 0 && (
                <div className="flex justify-between items-center text-green-600 font-bold animate-in fade-in slide-in-from-top-1 duration-200">
                    <span className="text-sm font-mono">-{totals.discountAmount.toFixed(2)}</span>
                    <span className="text-[10px]">الخصم</span>
                </div>
            )}

            <div className="h-[1px] bg-slate-100 my-1" />

            {/* Total Row */}
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-baseline gap-1">
                    <span className="text-[10px] text-slate-400 font-bold">EGP</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">{totals.total.toFixed(2)}</span>
                </div>
                <span className="font-black text-xl text-slate-800">الإجمالي</span>
            </div>

            {/* Calculations Row: Tax & Discount */}
            <div className="grid grid-cols-2 gap-2 mb-0.5">
                {/* Tax Checkbox */}
                <div className="flex items-center justify-center gap-2 border rounded-lg h-9 bg-slate-50 border-slate-200 hover:border-blue-400 transition-all cursor-pointer px-2" onClick={() => handleTaxChange(totals.taxRate === 0)}>
                    <Checkbox
                        id="tax-mode"
                        checked={totals.taxRate > 0}
                        onCheckedChange={(c) => handleTaxChange(c as boolean)}
                        className="rounded-full w-4 h-4 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shadow-none"
                    />
                    <Label htmlFor="tax-mode" className="cursor-pointer text-[10px] font-extrabold text-slate-600 leading-none">ضريبة (14%)</Label>
                </div>

                {/* Discount Box */}
                <div className="relative group">
                    <Input
                        placeholder="."
                        className="text-center font-black h-9 border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                        value={totals.discountAmount > 0 ? totals.discountAmount : ''}
                        onChange={(e) => setTotals({ discountAmount: Number(e.target.value) })}
                    />
                    <span className="absolute right-2 top-2.5 text-[9px] text-slate-400 font-black uppercase pointer-events-none group-focus-within:text-blue-500">الخصم</span>
                </div>
            </div>

            {/* Payment Methods Tabs */}
            <Tabs value={header.paymentMethod} onValueChange={(v: any) => setHeader({ paymentMethod: v })} className="w-full">
                <TabsList className="w-full grid grid-cols-3 h-8 bg-slate-100 p-1 rounded-lg">
                    <TabsTrigger value="credit" className="text-[10px] font-black rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">تحويل</TabsTrigger>
                    <TabsTrigger value="card" className="text-[10px] font-black rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">فيزا</TabsTrigger>
                    <TabsTrigger value="cash" className="text-[10px] font-black rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">نقدي</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Big Checkout Button */}
            <Button
                type="button"
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-xl font-black rounded-xl mt-0.5 shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
                onClick={(e) => handleCheckout(e)}
                disabled={isLoading}
            >
                <div className="flex items-center gap-2">
                    <Banknote size={24} />
                    <span>{header.paymentMethod === 'cash' ? 'دفع نقدي' : header.paymentMethod === 'card' ? 'دفع فيزا' : 'دفع تحويل'}</span>
                </div>
            </Button>

            {/* Auto Print & Layout Control */}
            <div className="flex flex-col gap-2 py-0.5 border-t mt-1 pt-2">
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="auto-print"
                            checked={autoPrint}
                            onCheckedChange={(c) => setAutoPrint(c as boolean)}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded w-3.5 h-3.5"
                        />
                        <Label htmlFor="auto-print" className="text-[10px] text-slate-500 font-extrabold cursor-pointer">طباعة تلقائية</Label>
                    </div>

                    <Tabs
                        value={settings.printLayout}
                        onValueChange={(v: any) => setSettings({ printLayout: v })}
                        className="h-7"
                    >
                        <TabsList className="h-7 bg-slate-200/50 p-0.5">
                            <TabsTrigger value="standard" className="text-[9px] font-black h-6 px-2">A4</TabsTrigger>
                            <TabsTrigger value="thermal" className="text-[9px] font-black h-6 px-2">📟</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

        </div>
    );
}
