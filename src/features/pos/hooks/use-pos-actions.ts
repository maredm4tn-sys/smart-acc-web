"use client";

import { usePOS } from "../context/pos-context";
import { usePrinting } from "@/components/printing/print-provider";
import { useState } from "react";
import { toast } from "sonner";

export function usePOSActions() {
    const { checkout, clearCart, setHeader, setTotals, settings } = usePOS();
    const { printInvoice } = usePrinting();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleIssueInvoice = async (autoPrint: boolean) => {
        setIsProcessing(true);
        try {
            // 1. Save to database
            const result = await checkout();

            if (result && result.success && result.id) {
                // 2. Handle Printing if enabled
                if (autoPrint) {
                    await printInvoice({
                        id: result.id,
                        type: settings.printLayout || 'thermal',
                        autoPrint: true
                    });
                } else {
                    toast.success(`تم حفظ الفاتورة #${result.id}`);
                }

                // 3. ONLY Reset state AFTER print window is closed or signal is received
                clearCart();
                setHeader({ customerId: 0, customerName: "", paymentMethod: 'cash', priceType: 'retail' });
                setTotals({ paid: 0, discountAmount: 0, discountPercent: 0, deliveryFee: 0 });
            }
        } catch (error) {
            console.error("Issue Invoice Error:", error);
            toast.error("حدث خطأ أثناء إصدار الفاتورة");
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        handleIssueInvoice,
        isProcessing
    };
}
