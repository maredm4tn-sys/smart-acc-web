
import React from 'react';

export type ReceiptData = {
    storeName: string;
    invoiceNumber: string;
    date: string;
    customerName: string;
    items: {
        description: string;
        qty: number;
        price: number;
        total: number;
    }[];
    subtotal: number;
    tax: number;
    total: number;
};

export const PosReceipt = React.forwardRef<HTMLDivElement, { data: ReceiptData | null }>(({ data }, ref) => {
    if (!data) return null;

    return (
        <div ref={ref} className="p-2 text-black font-mono text-[12px] leading-tight w-[80mm] mx-auto">
            <div className="text-center mb-4">
                <h2 className="text-lg font-bold uppercase border-b-2 border-black pb-1 mb-1">{data.storeName}</h2>
                <p>Welcome</p>
            </div>

            <div className="mb-2 space-y-1">
                <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date(data.date).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex justify-between">
                    <span>Time:</span>
                    <span>{new Date(data.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                    <span>Inv #:</span>
                    <span>{data.invoiceNumber || '---'}</span>
                </div>
                <div className="flex justify-between">
                    <span>Cust:</span>
                    <span className="truncate max-w-[120px]">{data.customerName}</span>
                </div>
            </div>

            <div className="border-t border-b border-black border-dashed py-1 mb-2">
                <div className="flex font-bold mb-1">
                    <span className="w-8">Qty</span>
                    <span className="flex-1">Item</span>
                    <span className="w-12 text-right">Price</span>
                </div>
                {data.items.map((item, i) => (
                    <div key={i} className="flex mb-1">
                        <span className="w-8">{item.qty}</span>
                        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{item.description}</span>
                        <span className="w-12 text-right">{item.total.toFixed(2)}</span>
                    </div>
                ))}
            </div>

            <div className="mb-4 space-y-1 font-bold">
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{data.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Tax (14%):</span>
                    <span>{data.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg border-t-2 border-black pt-1 mt-1">
                    <span>TOTAL:</span>
                    <span>{data.total.toFixed(2)}</span>
                </div>
            </div>

            <div className="text-center text-[10px] mt-4">
                <p>Thank you for shopping with us!</p>
                <p>Please come again.</p>
                <p className="mt-2">*** Powered by Smart Acc ***</p>
            </div>
        </div>
    );
});

PosReceipt.displayName = "PosReceipt";
