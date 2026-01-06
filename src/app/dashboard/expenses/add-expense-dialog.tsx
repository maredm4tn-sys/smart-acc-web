"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createExpense } from "@/features/accounting/actions";
import { PlusCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Account = {
    id: number;
    name: string;
    code: string;
};

export function AddExpenseDialog({ accounts }: { accounts: Account[] }) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    // const { toast } = useToast(); // Sonner uses direct import

    // Form State
    const [accountId, setAccountId] = useState<string>("");
    const [amount, setAmount] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!accountId || !amount) {
            toast.error("بيانات ناقصة", { description: "يرجى اختيار بند المصروف وتحديد المبلغ." });
            return;
        }

        startTransition(async () => {
            const formData = {
                accountId: parseInt(accountId),
                amount: parseFloat(amount),
                date,
                description
            };

            const result = await createExpense(formData);

            if (result.success) {
                toast.success("تم بنجاح", { description: "تم تسجيل المصروف وخصمه من الخزينة." });
                setOpen(false);
                // Reset form
                setAmount("");
                setDescription("");
            } else {
                toast.error("خطأ", { description: result.message });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                    <PlusCircle size={16} />
                    تسجيل مصروف
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>تسجيل مصروف جديد</DialogTitle>
                    <DialogDescription>سيتم إنشاء قيد يومية لخصم المبلغ من الخزينة.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="date">تاريخ المصروف</Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>بند المصروف (الحساب)</Label>
                        <Select value={accountId} onValueChange={setAccountId}>
                            <SelectTrigger>
                                <SelectValue placeholder="اختر نوع المصروف..." />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.length === 0 ? (
                                    <div className="p-2 text-sm text-gray-500 text-center">لا توجد حسابات مصروفات. أضفها من شجرة الحسابات.</div>
                                ) : (
                                    accounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id.toString()}>
                                            {acc.code} - {acc.name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">المبلغ (EGP)</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="desc">ملاحظات / وصف (اختياري)</Label>
                        <Input
                            id="desc"
                            placeholder="مثال: فاتورة كهرباء شهر 1"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                        <Button type="submit" disabled={isPending} className="bg-red-600 hover:bg-red-700">
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    جاري الحفظ...
                                </>
                            ) : (
                                "حفظ المصروف"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
