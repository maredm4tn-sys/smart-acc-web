import { db } from "@/db";
import { invoices, invoiceItems, products, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PrintButton } from "./print-button";
import { getSettings } from "@/features/settings/actions";
import { getDictionary, getLocale } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";

export default async function InvoicePrintPage(props: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ type?: string; auto?: string }>
}) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const type = searchParams.type || 'standard';
    const auto = searchParams.auto === 'true';

    const dict = await getDictionary();
    let invoice = null;
    let items: any[] = [];
    let settings = null;

    try {
        const invId = parseInt(params.id);
        const invRes = await db.select().from(invoices).where(eq(invoices.id, invId));
        settings = await getSettings();

        if (invRes.length > 0) {
            invoice = invRes[0];
            items = await db.select({
                description: invoiceItems.description,
                quantity: invoiceItems.quantity,
                unitPrice: invoiceItems.unitPrice,
                total: invoiceItems.total,
                sku: products.sku
            })
                .from(invoiceItems)
                .leftJoin(products, eq(invoiceItems.productId, products.id))
                .where(eq(invoiceItems.invoiceId, invId));
        }
    } catch (e) {
        console.error("Print Page Error", e);
    }

    if (!invoice) return notFound();

    const dateObj = new Date(invoice.createdAt || new Date());
    const dateStr = dateObj.toLocaleDateString('en-GB');
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // --- Improved Auto-Print & Auto-Close Script ---
    const autoPrintScript = auto ? (
        <script dangerouslySetInnerHTML={{
            __html: `
                (function() {
                    window.addEventListener('afterprint', () => {
                        window.close();
                    });
                    window.onload = function() {
                        setTimeout(function() {
                            window.focus();
                            window.print();
                        }, 1000);
                    };
                })();
            `
        }} />
    ) : null;

    // --- THERMAL LAYOUT (80mm) ---
    if (type === 'thermal') {
        return (
            <div className="bg-white min-h-screen text-black font-mono font-bold" style={{ width: '80mm', margin: '0 auto', padding: '8mm' }}>
                <style>{`
                    @media print {
                        @page { size: 80mm auto; margin: 0; }
                        body { margin: 0; padding: 0; width: 80mm; background: white; }
                        .no-print { display: none; }
                    }
                `}</style>
                {autoPrintScript}

                <div className="text-center mb-2">
                    <h1 className="text-xl leading-tight font-black">{settings?.name || "المحاسب الذكي"}</h1>
                    <div className="border-t-2 border-black my-1" />
                    <p className="text-sm">فاتورة مبيعات</p>
                </div>

                <div className="text-[12px] space-y-1 my-3">
                    <div className="flex justify-between"><span>التاريخ:</span><span>{dateStr}</span></div>
                    <div className="flex justify-between"><span>الوقت:</span><span>{timeStr}</span></div>
                    <div className="flex justify-between"><span>رقم الفاتورة:</span><span>#{invoice.invoiceNumber}</span></div>
                    <div className="flex justify-between"><span>العميل:</span><span>{invoice.customerName || "عميل نقدي"}</span></div>
                </div>

                <div className="border-t-2 border-dashed border-black my-2" />
                <div className="flex text-[11px] pb-1 font-black">
                    <span className="w-10">الكمية</span>
                    <span className="flex-1 px-1">الصنف</span>
                    <span className="w-20 text-left">الإجمالي</span>
                </div>
                <div className="border-t border-black mb-1" />

                <div className="space-y-2 mb-4">
                    {items.map((item, i) => (
                        <div key={i} className="flex text-[12px] items-start border-b border-gray-100 pb-1">
                            <span className="w-10">{Number(item.quantity)}</span>
                            <span className="flex-1 px-1 leading-tight">{item.description}</span>
                            <span className="w-20 text-left font-black">{Number(item.total).toFixed(2)}</span>
                        </div>
                    ))}
                </div>

                <div className="border-t-2 border-dashed border-black my-2" />
                <div className="text-[12px] space-y-1">
                    <div className="flex justify-between"><span>المجموع:</span><span>{Number(invoice.subtotal).toFixed(2)}</span></div>
                    {Number(invoice.taxTotal) > 0 && <div className="flex justify-between"><span>الضريبة (14%):</span><span>{Number(invoice.taxTotal).toFixed(2)}</span></div>}
                    {Number(invoice.discountAmount) > 0 && <div className="flex justify-between"><span>الخصم:</span><span>-{Number(invoice.discountAmount).toFixed(2)}</span></div>}
                </div>
                <div className="border-t-2 border-black my-2" />

                <div className="flex justify-between items-center text-xl py-1 font-black">
                    <span>الإجمالي:</span>
                    <span>{Number(invoice.totalAmount).toFixed(2)}</span>
                </div>

                <div className="text-center text-[10px] mt-8 opacity-70">
                    <p>شكراً لتعاملكم معنا</p>
                    <p>*** المحاسب الذكي ***</p>
                </div>

                <div className="no-print mt-8 flex justify-center">
                    <PrintButton />
                </div>
            </div>
        );
    }

    // --- STANDARD A4 LAYOUT ---
    return (
        <div className="bg-white min-h-screen p-0 sm:p-8 text-black font-sans" dir="rtl">
            <style>{`
                @media print {
                    @page { size: A4; margin: 15mm; }
                    body { margin: 0; padding: 0; background: white; }
                    .no-print { display: none; }
                }
            `}</style>
            {autoPrintScript}

            <div className="max-w-[210mm] mx-auto bg-white p-8 border print:border-0 shadow-sm print:shadow-none min-h-[297mm] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-blue-600 pb-6 mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-blue-900 mb-2">{settings?.name || "المحاسب الذكي"}</h1>
                        <p className="text-gray-600 font-bold">{settings?.address || "العنوان غير مسجل"}</p>
                        <p className="text-gray-600 font-bold">{settings?.phone || "الهاتف غير مسجل"}</p>
                    </div>
                    <div className="text-left" dir="ltr">
                        <div className="bg-blue-900 text-white px-6 py-2 rounded-lg mb-2 inline-block">
                            <h2 className="text-xl font-bold uppercase tracking-widest">فاتورة مبيعات</h2>
                        </div>
                        <div className="space-y-1 text-sm font-bold text-gray-700">
                            <p>رقم الفاتورة: <span className="text-blue-900">#{invoice.invoiceNumber}</span></p>
                            <p>التاريخ: {dateStr}</p>
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-8 mb-10">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h3 className="text-xs font-black text-slate-400 uppercase mb-2">بيانات العميل</h3>
                        <p className="text-lg font-black text-slate-900">{invoice.customerName || "عميل نقدي"}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left" dir="ltr">
                        <h3 className="text-xs font-black text-slate-400 uppercase mb-2">PAYMENT METHOD</h3>
                        <p className="text-lg font-black text-blue-700 uppercase">{invoice.paymentMethod || "CASH"}</p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="flex-1">
                    <table className="w-full border-collapse overflow-hidden rounded-xl shadow-sm">
                        <thead className="bg-blue-900 text-white">
                            <tr>
                                <th className="p-4 text-right">الصنف / الوصف</th>
                                <th className="p-4 text-center w-24">الكمية</th>
                                <th className="p-4 text-center w-32">سعر الوحدة</th>
                                <th className="p-4 text-left w-32">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 font-medium">
                            {items.map((item, i) => (
                                <tr key={i} className="border-b border-slate-100 even:bg-slate-50/50">
                                    <td className="p-4 text-right font-bold">{item.description}</td>
                                    <td className="p-4 text-center font-mono">{Number(item.quantity).toFixed(2)}</td>
                                    <td className="p-4 text-center font-mono">{Number(item.unitPrice).toFixed(2)}</td>
                                    <td className="p-4 text-left font-mono font-bold" dir="ltr">{Number(item.total).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals Section */}
                <div className="mt-8 flex justify-end">
                    <div className="w-72 space-y-3">
                        <div className="flex justify-between px-2 text-slate-500 font-bold">
                            <span>المجموع الفرعي:</span>
                            <span className="font-mono">{Number(invoice.subtotal).toFixed(2)}</span>
                        </div>
                        {Number(invoice.taxTotal) > 0 && (
                            <div className="flex justify-between px-2 text-slate-500 font-bold">
                                <span>الضريبة (14%):</span>
                                <span className="font-mono">{Number(invoice.taxTotal).toFixed(2)}</span>
                            </div>
                        )}
                        {Number(invoice.discountAmount) > 0 && (
                            <div className="flex justify-between px-2 text-green-600 font-bold">
                                <span>الخصم:</span>
                                <span className="font-mono">-{Number(invoice.discountAmount).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between bg-blue-900 text-white p-4 rounded-xl shadow-lg">
                            <span className="text-xl font-black">الإجمالي الكلي:</span>
                            <span className="text-2xl font-black font-mono">{Number(invoice.totalAmount).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Message */}
                <div className="mt-16 border-t pt-6 text-center text-slate-400 text-sm font-bold">
                    <p>نشكركم لثقتكم بنا، ونتمنى رؤيتكم مرة أخرى قريباً.</p>
                </div>
            </div>

            <div className="fixed bottom-8 left-8 no-print">
                <PrintButton />
            </div>
        </div>
    );
}
