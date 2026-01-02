import { db } from "@/db";
import { invoices, invoiceItems, products, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PrintButton } from "./print-button";
import Image from "next/image";
import { getSettings } from "@/features/settings/actions";
import { getDictionary, getLocale } from "@/lib/i18n-server";

export default async function InvoicePrintPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const dict = await getDictionary();
    const locale = await getLocale();

    let invoice = null;
    let items: any[] = [];
    let settings = null;

    try {
        const invId = parseInt(params.id);
        const invRes = await db.select().from(invoices).where(eq(invoices.id, invId));
        settings = await getSettings(); // Fetch company settings

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
        // Mock data logic removed for succinctness, assuming DB works now
        console.error("Print Page Error", e);
    }

    if (!invoice) return notFound();

    // Format Date & Time
    const dateObj = new Date(invoice.createdAt || new Date());
    const timeStr = dateObj.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    return (
        <div className="bg-white min-h-screen p-8 text-black print:p-0 font-sans">
            {/* Print Button (Hidden when printing) */}
            <div className="mb-8 print:hidden flex justify-end">
                <PrintButton />
            </div>

            {/* Invoice Layout */}
            <div className="max-w-3xl mx-auto border p-8 print:border-0 print:w-full">
                {/* Header */}
                <div className="flex justify-between items-start mb-8 border-b pb-4">
                    <div className="flex gap-4 items-center">
                        <div className="relative h-24 w-24 overflow-hidden rounded-lg border flex items-center justify-center bg-gray-50">
                            {settings?.logoUrl ? (
                                <img
                                    src={settings.logoUrl}
                                    alt="Company Logo"
                                    className="object-contain w-full h-full"
                                />
                            ) : (
                                <Image
                                    src="/logo.jpg"
                                    alt="Default Logo"
                                    fill
                                    className="object-cover"
                                />
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {Number(invoice.taxTotal) > 0 ? dict.Sales.Invoice.Print.Title : dict.Sales.Invoice.Print.SimpleTitle}
                            </h1>
                            <p className="text-gray-500 mt-1 uppercase tracking-wider text-xs">
                                {Number(invoice.taxTotal) > 0 ? "Tax Invoice" : "Invoice"}
                            </p>
                        </div>
                    </div>
                    <div className="text-left rtl:text-left">
                        <h2 className="font-bold text-xl text-primary">{settings?.name || dict.Logo}</h2>
                        <p className="text-sm text-gray-600">{settings?.address || ""}</p>
                        <p className="text-sm text-gray-600 dir-ltr flex justify-end gap-1">
                            <span>{settings?.phone || ""}</span>
                            {settings?.phone && <span className="text-gray-400">|</span>}
                            <span>{settings?.taxId ? `Tax ID: ${settings.taxId}` : ""}</span>
                        </p>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">{dict.Sales.Invoice.Print.BillTo}:</p>
                        <h3 className="font-bold text-lg">{invoice.customerName}</h3>
                        <p className="text-sm text-gray-500">{invoice.customerTaxId ? `${dict.Sales.Invoice.Print.TaxId}: ${invoice.customerTaxId}` : ''}</p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between border-b border-dashed pb-1">
                            <span className="text-gray-500">{dict.Sales.Invoice.Print.InvoiceNo}:</span>
                            <span className="font-mono font-bold">{invoice.invoiceNumber}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-dashed pb-1">
                            <span className="text-gray-500">{dict.Sales.Invoice.Print.Date}:</span>
                            <div className="flex flex-col items-center">
                                <span className="font-bold">{invoice.issueDate}</span>
                                <span className="text-[10px] text-gray-400 font-mono text-center leading-none mt-0.5">{timeStr}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full mb-8">
                    <thead>
                        <tr className="border-b-2 border-gray-800">
                            <th className="text-right py-2">{dict.Sales.Invoice.Print.Item}</th>
                            <th className="text-center py-2">{dict.Sales.Invoice.Print.Qty}</th>
                            <th className="text-center py-2">{dict.Sales.Invoice.Print.Price}</th>
                            <th className="text-left py-2">{dict.Sales.Invoice.Print.Total}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, i) => (
                            <tr key={i} className="border-b border-gray-200">
                                <td className="py-2">
                                    <div className="font-medium">{item.description}</div>
                                    <div className="text-xs text-gray-500">{item.sku}</div>
                                </td>
                                <td className="text-center py-2">{Number(item.quantity)}</td>
                                <td className="text-center py-2">{Number(item.unitPrice).toLocaleString()}</td>
                                <td className="text-left py-2 font-bold">{Number(item.total).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between py-1 border-b">
                            <span className="text-gray-600">{dict.Sales.Invoice.Print.Subtotal}:</span>
                            <span>{Number(invoice.subtotal).toLocaleString()} {invoice.currency || 'EGP'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b">
                            <span className="text-gray-600">{dict.Sales.Invoice.Print.Tax}:</span>
                            <span>{Number(invoice.taxTotal).toLocaleString()} {invoice.currency || 'EGP'}</span>
                        </div>
                        <div className="flex justify-between py-2 text-lg font-bold">
                            <span>{dict.Sales.Invoice.Print.GrandTotal}:</span>
                            <span>{Number(invoice.totalAmount).toLocaleString()} {invoice.currency || 'EGP'}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-4 border-t text-center text-sm text-gray-500">
                    <p>{dict.Sales.Invoice.Print.Footer}</p>
                </div>
            </div>
        </div>
    );
}
