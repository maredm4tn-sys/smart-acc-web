"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, RotateCcw } from "lucide-react";
import { createReturnInvoice } from "@/features/sales/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface InvoiceItem {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    productId: number;
}

interface ReturnInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoice: {
        id: number;
        invoiceNumber: string;
        items: InvoiceItem[];
    };
}

export function ReturnInvoiceDialog({ open, onOpenChange, invoice }: ReturnInvoiceDialogProps) {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);

    // State to track quantity to return for each item
    // Key: itemId, Value: returnQuantity
    const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});

    const handleQuantityChange = (itemId: number, maxQty: number, value: string) => {
        const qty = parseFloat(value);
        if (isNaN(qty) || qty < 0) {
            setReturnQuantities(prev => ({ ...prev, [itemId]: 0 }));
            return;
        }
        if (qty > maxQty) {
            toast.error("خطأ في الكمية: الكمية المرتجعة لا يمكن أن تزيد عن الكمية الأصلية");
            setReturnQuantities(prev => ({ ...prev, [itemId]: maxQty }));
            return;
        }
        setReturnQuantities(prev => ({ ...prev, [itemId]: qty }));
    };

    const calculateTotalRefund = () => {
        let total = 0;
        invoice.items.forEach(item => {
            const qty = returnQuantities[item.id] || 0;
            total += qty * Number(item.unitPrice);
        });
        return total;
    };

    const handleReturn = async () => {
        const itemsToReturn = invoice.items
            .map(item => ({
                productId: item.productId,
                description: item.description,
                quantity: returnQuantities[item.id] || 0,
                unitPrice: Number(item.unitPrice)
            }))
            .filter(item => item.quantity > 0);

        if (itemsToReturn.length === 0) {
            toast.warning("تنبيه: يجب تحديد كمية صنف واحد على الأقل للاسترجاع");
            return;
        }

        setIsPending(true);
        try {
            const result = await createReturnInvoice({
                originalInvoiceId: invoice.id,
                returnDate: new Date().toISOString().split('T')[0],
                items: itemsToReturn
            });

            if (result.success) {
                toast.success(result.message);
                onOpenChange(false);
                setReturnQuantities({});
                router.refresh();
                // Force reload to ensure Electron UI updates immediately
                window.location.reload();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("خطأ غير متوقع: حدث خطأ أثناء معالجة المرتجع");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RotateCcw className="h-5 w-5 text-orange-500" />
                        عجل مرتجع للفاتورة رقم {invoice.invoiceNumber}
                    </DialogTitle>
                    <DialogDescription>
                        حدد الكميات المراد إرجاعها من الأصناف التالية. سيتم إعادة الكميات للمخزن وإنشاء قيد عكسي.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right">الصنف</TableHead>
                                <TableHead className="text-center">الكمية الأصلية</TableHead>
                                <TableHead className="text-center">سعر الوحدة</TableHead>
                                <TableHead className="text-center w-[150px]">الكمية المرتجعة</TableHead>
                                <TableHead className="text-left font-bold">قيمة المرتجع</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoice.items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-center">{Number(item.unitPrice).toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            min="0"
                                            max={item.quantity}
                                            value={returnQuantities[item.id] || ''}
                                            onChange={(e) => handleQuantityChange(item.id, item.quantity, e.target.value)}
                                            placeholder="0"
                                            className="text-center font-bold"
                                        />
                                    </TableCell>
                                    <TableCell className="text-left font-bold text-orange-600 dir-ltr">
                                        {((returnQuantities[item.id] || 0) * Number(item.unitPrice)).toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="mt-6 flex justify-between items-center bg-orange-50 p-4 rounded-lg border border-orange-100">
                        <span className="font-bold text-gray-700">إجمالي قيمة المرتجع:</span>
                        <span className="text-2xl font-bold text-orange-600 dir-ltr">
                            {calculateTotalRefund().toFixed(2)} JOD
                        </span>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        إلغاء
                    </Button>
                    <Button
                        onClick={handleReturn}
                        disabled={isPending || calculateTotalRefund() === 0}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        تأكيد المرتجع
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
