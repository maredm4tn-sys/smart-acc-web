"use client";

import { useEffect, useState } from "react";
import { getQueuedActions, markAsSynced } from "@/lib/offline-db";
import { createProduct } from "@/features/inventory/actions";
import { createInvoice } from "@/features/sales/actions";
import { createCustomer } from "@/features/customers/actions";
import { createSupplier } from "@/features/suppliers/actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function OfflineSyncManager() {
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const handleSync = async () => {
            if (!navigator.onLine) return;

            const queue = await getQueuedActions();
            if (queue.length === 0) return;

            setIsSyncing(true);
            let successCount = 0;

            for (const item of queue) {
                try {
                    let result: any = { success: false };

                    if (item.type === 'CREATE_PRODUCT') {
                        result = await createProduct(item.payload);
                    } else if (item.type === 'CREATE_INVOICE') {
                        result = await createInvoice(item.payload);
                    } else if (item.type === 'CREATE_CUSTOMER') {
                        result = await createCustomer(item.payload);
                    } else if (item.type === 'CREATE_SUPPLIER') {
                        result = await createSupplier(item.payload);
                    }

                    if (result.success) {
                        await markAsSynced(item.id);
                        successCount++;
                    }
                } catch (e) {
                    console.error("Failed to sync item", item.id, e);
                }
            }

            if (successCount > 0) {
                toast.success(`تم مزامنة ${successCount} عمليات ناجحة كانت معلقة.`);
                setTimeout(() => window.location.reload(), 1500);
            }
            setIsSyncing(false);
        };

        window.addEventListener('online', handleSync);
        if (navigator.onLine) handleSync();

        return () => window.removeEventListener('online', handleSync);
    }, []);

    if (!isSyncing) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 z-[9999] animate-bounce">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-bold">جاري رفع البيانات المعلقة...</span>
        </div>
    );
}
