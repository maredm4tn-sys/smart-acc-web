
import React from 'react';
import { useTranslation } from '@/components/providers/i18n-provider';

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
    discount?: number;
    paymentMethod?: string;
    total: number;
    tokenNumber?: number;
};

export const PosReceipt = React.forwardRef<HTMLDivElement, { data: ReceiptData | null }>(({ data }, ref) => {
    const { dict, lang } = useTranslation() as any;
    if (!data) return null;

    return (
        <div ref={ref} className="p-2 text-black font-mono text-[12px] leading-tight w-[80mm] mx-auto">
            <div className="text-center mb-4">
                <h2 className="text-lg font-bold uppercase border-b-2 border-black pb-1 mb-1">{data.storeName}</h2>
                <p>{dict.POS.ReceiptWelcome || "Welcome"}</p>
            </div>

            <div className="mb-2 space-y-1">
                <div className="flex justify-between">
                    <span>{dict.Sales.Invoice.Form.IssueDate || "Date"}:</span>
                    <span>{new Date(data.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</span>
                </div>
                <div className="flex justify-between">
                    <span>{dict.POS.ReceiptTime || "Time"}:</span>
                    <span>{new Date(data.date).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                    <span>{dict.Sales.Invoice.Form.Table.Number || "Inv #"}:</span>
                    <span>{data.invoiceNumber || '---'}</span>
                </div>
                <div className="flex justify-between">
                    <span>{dict.Sales.Invoice.Form.Customer || "Cust"}:</span>
                    <span className="truncate max-w-[120px]">{data.customerName}</span>
                </div>
                {/* Token Number Display */}
                {data.tokenNumber && (
                    <div className="flex flex-col items-center border-2 border-black border-dashed mt-2 p-1">
                        <span className="text-[10px] font-bold uppercase">{dict.POS.QueueNo || "Queue No"}</span>
                        <span className="text-2xl font-black">{data.tokenNumber}</span>
                    </div>
                )}
            </div>

            <div className="border-t border-b border-black border-dashed py-1 mb-2">
                <div className="flex font-bold mb-1">
                    <span className="w-8">{dict.Sales.Invoice.Form.Table.Qty || "Qty"}</span>
                    <span className="flex-1">{dict.Sales.Invoice.Form.Table.Item || "Item"}</span>
                    <span className="w-12 text-right">{dict.Sales.Invoice.Form.Table.Price || "Price"}</span>
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
                    <span>{dict.POS.Subtotal || "Subtotal"}:</span>
                    <span>{data.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>{dict.POS.Tax || "Tax (14%)"}:</span>
                    <span>{data.tax.toFixed(2)}</span>
                </div>
                {data.discount !== undefined && data.discount > 0 && (
                    <div className="flex justify-between text-red-700">
                        <span>{dict.POS.Discount || "Discount"}:</span>
                        <span>-{data.discount.toFixed(2)}</span>
                    </div>
                )}
                {data.paymentMethod && (
                    <div className="flex justify-between text-[10px]">
                        <span>{dict.POS.PaymentMethod || "Payment"}:</span>
                        <span>{dict.POS[data.paymentMethod.charAt(0).toUpperCase() + data.paymentMethod.slice(1)] || data.paymentMethod}</span>
                    </div>
                )}
                <div className="flex justify-between text-lg border-t-2 border-black pt-1 mt-1">
                    <span>{dict.POS.Total || "TOTAL"}:</span>
                    <span>{data.total.toFixed(2)}</span>
                </div>
            </div>

            <div className="text-center text-[10px] mt-4">
                <p>{dict.POS.ReceiptFooter1 || "Thank you for shopping with us!"}</p>
                <p>{dict.POS.ReceiptFooter2 || "Please come again."}</p>
                <p className="mt-2">*** {dict.POS.PoweredBy || "Powered by Smart Acc"} ***</p>
            </div>
        </div>
    );
});

PosReceipt.displayName = "PosReceipt";
