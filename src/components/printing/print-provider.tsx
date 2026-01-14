"use client";

import React, { createContext, useContext, useCallback, useRef } from 'react';

type PrintOptions = {
    id: number;
    type: 'standard' | 'thermal';
    autoPrint?: boolean;
};

type PrintContextType = {
    printInvoice: (options: PrintOptions) => Promise<void>;
};

const PrintContext = createContext<PrintContextType | undefined>(undefined);

export function PrintProvider({ children }: { children: React.ReactNode }) {
    const printWindowRef = useRef<Window | null>(null);

    const printInvoice = useCallback(({ id, type, autoPrint = true }: PrintOptions) => {
        return new Promise<void>((resolve) => {
            const printUrl = `/print/sales/${id}?type=${type}&auto=${autoPrint}&t=${Date.now()}`;

            // Features string for a controlled popup
            const features = 'width=450,height=600,left=500,top=100,resizable=yes,scrollbars=yes';

            // Open the print window
            const win = window.open(printUrl, 'smart_acc_print', features);
            printWindowRef.current = win;

            if (!win) {
                console.warn("Popup blocked or failed to open");
                resolve();
                return;
            }

            // Message listener for the "Done" signal from the print page
            const handleMessage = (event: MessageEvent) => {
                if (event.data && event.data.type === 'PRINT_COMPLETED') {
                    window.removeEventListener('message', handleMessage);
                    resolve();
                }
            };

            window.addEventListener('message', handleMessage);

            // Fallback: resolution after a certain time OR if window is closed manually
            const checkInterval = setInterval(() => {
                if (!win || win.closed) {
                    clearInterval(checkInterval);
                    window.removeEventListener('message', handleMessage);
                    resolve();
                }
            }, 500);
        });
    }, []);

    return (
        <PrintContext.Provider value={{ printInvoice }}>
            {children}
        </PrintContext.Provider>
    );
}

export const usePrinting = () => {
    const context = useContext(PrintContext);
    if (!context) throw new Error("usePrinting must be used within a PrintProvider");
    return context;
};
