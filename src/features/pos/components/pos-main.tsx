"use client";

import { POSProvider, usePOS } from "../context/pos-context";
import { POSHeader } from "./pos-header";
import { POSGrid } from "./pos-grid";
import { POSFooter } from "./pos-footer";
import { POSProductList } from "./pos-product-list";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";

function POSShortcuts() {
    const { checkout, suspendInvoice } = usePOS();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F10') {
                e.preventDefault();
                checkout();
            }
            if (e.key === 'F9') {
                e.preventDefault();
                suspendInvoice();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [checkout, suspendInvoice]);

    return null;
}

export function POSMain() {
    return (
        <POSProvider>
            <div className="flex flex-col h-full bg-slate-100 rounded-lg overflow-hidden border shadow-xl">
                <POSShortcuts />
                <div className="flex-1 flex gap-4 p-4 h-full overflow-hidden flex-row-reverse">
                    {/* Left: Cart Sidebar (Fixed Width 320px) */}
                    <div className="w-[320px] flex flex-col bg-white rounded-lg shadow-sm border overflow-hidden h-full shrink-0">
                        {/* We keep the header and selectors fixed at the top if desired, or make everything scroll. 
                            The user said "under the basket", so let's make the items + footer scroll together. */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <POSGrid />
                        </div>
                    </div>

                    {/* Right: Product Grid (Remaining Space) */}
                    <div className="flex-1 bg-white rounded-lg shadow-sm border overflow-hidden h-full">
                        <POSProductList />
                    </div>
                </div>
                <Toaster />

                {/* Global Hidden Iframe for POS Printing */}
                <iframe
                    name="pos_print_frame"
                    id="pos_print_frame"
                    title="pos_print_frame"
                    style={{ position: 'fixed', right: '-1000px', bottom: '-1000px', width: '10px', height: '10px', opacity: 0, border: 'none' }}
                />
            </div>
        </POSProvider>
    );
}
