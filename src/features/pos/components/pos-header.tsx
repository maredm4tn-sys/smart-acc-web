"use client";

import { usePOS } from "../context/pos-context";
import { User, Store, Calendar, CreditCard, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ShiftManager } from "@/features/shifts/components/shift-manager";

export function POSHeader() {
    const { header, setHeader, customers } = usePOS();

    // Type Safe Setters
    const setCustomer = (id: string) => {
        const cust = customers.find(c => String(c.id) === id);
        setHeader({ customerId: Number(id), customerName: cust?.name || "" });
    };

    const setPriceType = (val: string) => setHeader({ priceType: val as any });

    return (
        <div className="bg-white border-b p-3 shadow-sm space-y-3">
            {/* Top Row: Title & Invoice Info */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
                        <User size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg leading-none">فاتورة مبيعات</h2>
                        <span className="text-xs text-gray-500 font-mono">#INV-NEW</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <ShiftManager />
                    <Button variant="outline" size="sm" className="gap-2 text-orange-600 border-orange-200 bg-orange-50">
                        <RotateCcw size={16} /> مرتجع (Ctrl+R)
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Store size={16} /> المخزن الرئيسي
                    </Button>
                </div>
            </div>

            {/* Second Row: Inputs Form */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border">

                {/* 1. Customer */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">العميل (F2)</label>
                    <Select value={String(header.customerId)} onValueChange={setCustomer}>
                        <SelectTrigger className="h-9 bg-white border-blue-200 focus:border-blue-500">
                            <SelectValue placeholder="اختر العميل" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">عميل نقدي</SelectItem>
                            {customers.map(c => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* 2. Price Type */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">نوع السعر</label>
                    <Select value={header.priceType} onValueChange={setPriceType}>
                        <SelectTrigger className="h-9 bg-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="retail">قطاعي</SelectItem>
                            <SelectItem value="wholesale">جملة</SelectItem>
                            <SelectItem value="half_wholesale">نصف جملة</SelectItem>
                            <SelectItem value="special">خاص</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* 3. Payment Method */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">طريقة الدفع</label>
                    <Select value={header.paymentMethod} onValueChange={(v: any) => setHeader({ paymentMethod: v })}>
                        <SelectTrigger className="h-9 bg-white">
                            <div className="flex items-center gap-2">
                                <CreditCard size={14} className="text-gray-400" />
                                <SelectValue />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="cash">نقدي</SelectItem>
                            <SelectItem value="card">فيزا / بنك</SelectItem>
                            <SelectItem value="credit">آجل</SelectItem>
                        </SelectContent>
                    </Select>
                </div>


            </div>
        </div>
    );
}
