"use client";

import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Save, Printer } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createInvoice } from "../actions";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/providers/i18n-provider";
import { useSWRConfig } from "swr";

interface ProductOption {
    id: number;
    name: string;
    price: number;
    sku: string;
}

interface CustomerOption {
    id: number;
    name: string;
}

interface RepresentativeOption {
    id: number;
    name: string;
    type: "sales" | "delivery";
}

import { ProductCombobox } from "./product-combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function InvoiceForm({ products, customers, representatives = [], settings }: {
    products: ProductOption[],
    customers: CustomerOption[],
    representatives?: RepresentativeOption[],
    settings?: any
}) {
    const { dict: rawDict } = useTranslation();
    const dict = rawDict as any;
    const router = useRouter();
    const { mutate } = useSWRConfig();
    const [totals, setTotals] = useState({ subtotal: 0, tax: 0, total: 0 });
    const [autoPrint, setAutoPrint] = useState(true);
    const [printLayout, setPrintLayout] = useState<'standard' | 'thermal'>(settings?.defaultPrintSales || 'standard');
    const printFrameRef = useRef<HTMLIFrameElement>(null);


    // ... existing ...
    const invoiceSchema = z.object({
        customerName: z.string().min(1, dict.Sales.Invoice.Form.Errors.CustomerRequired),
        issueDate: z.string().min(1, dict.Sales.Invoice.Form.Errors.DateRequired),
        currency: z.string().min(1, dict.Sales.Invoice.Form.Errors.CurrencyRequired),
        exchangeRate: z.number().min(0.000001, dict.Sales.Invoice.Form.Errors.RatePositive),
        includeTax: z.boolean(),
        initialPayment: z.number().min(0).optional(),
        discountAmount: z.number().min(0).default(0), // Added Discount
        representativeId: z.coerce.number().optional().nullable(), // Sales Rep
        // Installment Fields
        isInstallment: z.boolean().default(false),
        installmentCount: z.number().min(0).default(0),
        installmentInterest: z.number().min(0).default(0),
        items: z.array(z.object({
            productId: z.string().min(1, dict.Sales.Invoice.Form.Errors.ProductRequired),
            description: z.string().optional(),
            quantity: z.number().min(1, dict.Sales.Invoice.Form.Errors.QtyMin),
            unitPrice: z.number().min(0, dict.Sales.Invoice.Form.Errors.PriceMin),
        })).min(1, dict.Sales.Invoice.Form.Errors.OneItem)
    });

    type InvoiceFormValues = z.infer<typeof invoiceSchema>;

    const { control, register, handleSubmit, watch, setValue, setFocus, reset, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(invoiceSchema),
        defaultValues: {
            customerName: "عميل نقدي",
            issueDate: new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0],
            currency: "EGP",
            exchangeRate: 1,
            includeTax: false,
            initialPayment: 0,
            discountAmount: 0,
            isInstallment: false,
            installmentCount: 12,
            installmentInterest: 0,
            items: [
                { productId: "", description: "", quantity: 1, unitPrice: 0 }
            ]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    const watchedItems = useWatch({ control, name: "items" });
    const isInstallment = watch("isInstallment");
    const installmentCount = watch("installmentCount") || 1;
    const installmentInterest = watch("installmentInterest") || 0;
    const includeTax = watch("includeTax");
    const selectedCurrency = watch("currency");
    const initialPayment = useWatch({ control, name: "initialPayment" }) || 0;
    const discountAmount = useWatch({ control, name: "discountAmount" }) || 0;

    // Calculate totals live
    useEffect(() => {
        const items = watchedItems || [];
        const sub = items.reduce((sum, item) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unitPrice) || 0;
            return sum + (qty * price);
        }, 0);

        const tax = includeTax ? sub * 0.14 : 0;
        let total = (sub + tax) - discountAmount;

        // Add Interest if installment
        if (isInstallment && installmentInterest > 0) {
            total = total + (total * (installmentInterest / 100));
        }

        setTotals({
            subtotal: sub,
            tax: tax,
            total: total
        });
    }, [watchedItems, includeTax, isInstallment, installmentInterest, discountAmount]);

    // FORCE Auto-fill Payment to match Total (Only if NOT installment)
    useEffect(() => {
        if (!isInstallment) {
            setValue("initialPayment", Number(totals.total.toFixed(2)), { shouldValidate: true });
        }
    }, [totals.total, setValue, isInstallment]);

    const onProductChange = (index: number, productId: string) => {
        const prod = products.find(p => p.id.toString() === productId);
        if (prod) {
            setValue(`items.${index}.description` as const, prod.name, { shouldValidate: true, shouldDirty: true });
            setValue(`items.${index}.unitPrice` as const, prod.price, { shouldValidate: true, shouldDirty: true });
        }
    };

    // Barcode Handler
    const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const sku = e.currentTarget.value.trim();
            if (!sku) return;

            const product = products.find(p => p.sku === sku);
            if (product) {
                // Check if last item is empty, use it. Otherwise append.
                const lastItem = watchedItems[watchedItems.length - 1];
                const isLastEmpty = !lastItem.productId && !lastItem.description;

                if (isLastEmpty) {
                    // Reuse last empty row
                    const idx = watchedItems.length - 1;
                    setValue(`items.${idx}.productId`, product.id.toString(), { shouldValidate: true });
                    setValue(`items.${idx}.description`, product.name, { shouldValidate: true, shouldDirty: true });
                    setValue(`items.${idx}.unitPrice`, product.price, { shouldValidate: true, shouldDirty: true });
                    setValue(`items.${idx}.quantity`, 1, { shouldValidate: true, shouldDirty: true });
                } else {
                    append({
                        productId: product.id.toString(),
                        description: product.name,
                        unitPrice: product.price,
                        quantity: 1
                    });
                }
                toast.success(dict.Common.Success + ": " + product.name);
                e.currentTarget.value = ""; // Clear
            } else {
                toast.error(dict.Common.Error);
            }
        }
    };

    const [createdInvoiceId, setCreatedInvoiceId] = useState<number | null>(null);

    // F2 Shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                handleSubmit(onSubmit)();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSubmit]);

    const onSubmit = async (data: InvoiceFormValues) => {
        try {
            const res = await createInvoice({
                ...data,
                items: data.items.map(i => ({
                    productId: parseInt(i.productId),
                    description: i.description || "",
                    quantity: i.quantity,
                    unitPrice: i.unitPrice
                })),
                tenantId: "uuid"
            });

            // Improved Success Check: Check for success flag explicitly
            if (res && res.success) {
                toast.success(res.message || dict.Common.Success);

                // CRITICAL: Set ID immediately for print button
                if (res.id) {
                    setCreatedInvoiceId(res.id);

                    // Auto-print logic using window.open
                    if (autoPrint) {
                        const printUrl = `/print/sales/${res.id}?type=${printLayout}&auto=true&t=${Date.now()}`;
                        const printWindow = window.open(printUrl, 'invoice_print_window', 'width=400,height=600,left=1000,top=1000');
                        if (printWindow) {
                            setTimeout(() => {
                                try { if (!printWindow.closed) printWindow.close(); } catch (e) { }
                            }, 3000);
                        }
                    }
                }

                // Refresh Data
                mutate('invoices-list');
                mutate('dashboard-stats');

                // Auto-Clear Form with delay to ensure print triggers
                setTimeout(() => {
                    reset({
                        customerName: "عميل نقدي",
                        issueDate: new Date().toISOString().split('T')[0],
                        currency: "EGP",
                        exchangeRate: 1,
                        includeTax: false,
                        initialPayment: 0,
                        discountAmount: 0,
                        items: [{ productId: "", description: "", quantity: 1, unitPrice: 0 }]
                    });
                    setCreatedInvoiceId(null);
                }, 2000);
            } else {
                // Only show error if success is explicitly false or missing
                toast.error(res?.message || dict.Settings.Form.Error);
            }
        } catch (e: any) {
            console.error("Submit Error:", e);
            // DEBUG: Show FULL Error details to user
            toast.error(`Error: ${e.message || JSON.stringify(e)}`, { duration: 10000 });
        }
    };

    return (
        <div className="space-y-6">
            {/* Search Bar for Barcode */}
            <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1">
                        <label className="text-sm font-semibold text-blue-700 mb-1 block">
                            🔍 {dict.Sales.Invoice.Form.Table.Item} (Enter)
                        </label>
                        <Input
                            autoFocus
                            placeholder={dict.Sales.Invoice.Form.SelectProduct}
                            onKeyDown={handleBarcodeScan}
                            className="bg-white"
                        />
                    </div>
                </CardContent>
            </Card>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Header Data */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border p-4 rounded-md bg-gray-50/50">
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium mb-1 block">{dict.Sales.Invoice.Form.Customer}</label>
                        <Input
                            list="customers-list"
                            placeholder={dict.Sales.Invoice.Form.SelectCustomer}
                            className="bg-white"
                            autoComplete="off"
                            {...register("customerName")}
                        />
                        <datalist id="customers-list">
                            {customers && customers.map(c => (
                                <option key={c.id} value={c.name} />
                            ))}
                        </datalist>
                        {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName.message}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">{dict.Sales.Invoice.Form.IssueDate}</label>
                        <Input type="date" {...register("issueDate")} />
                        {errors.issueDate && <p className="text-red-500 text-xs mt-1">{errors.issueDate.message}</p>}
                    </div>

                    {/* Representative Selection */}
                    <div>
                        <label className="text-sm font-medium mb-1 block">{(dict as any).Representatives?.MenuLabel || "Representative"}</label>
                        <Select
                            onValueChange={(val) => {
                                setValue("representativeId", parseInt(val));
                            }}
                            defaultValue={watch("representativeId")?.toString()}
                        >
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder={(dict as any).Representatives?.SearchPlaceholder || "Select Representative"} />
                            </SelectTrigger>
                            <SelectContent>
                                {representatives.map((rep) => (
                                    <SelectItem key={rep.id} value={rep.id.toString()}>
                                        {rep.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">{dict.Sales.Invoice.Form.Currency}</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                            {...register("currency")}
                        >
                            <option value="EGP">{dict.Settings.Form.Currencies.EGP}</option>
                            <option value="USD">{dict.Settings.Form.Currencies.USD}</option>
                            <option value="EUR">{dict.Settings.Form.Currencies.EUR}</option>
                            <option value="SAR">{dict.Settings.Form.Currencies.SAR}</option>
                        </select>
                    </div>
                    {selectedCurrency !== 'EGP' && (
                        <div>
                            <label className="text-sm font-medium mb-1 block">{dict.Sales.Invoice.Form.ExchangeRate}</label>
                            <Input
                                type="number"
                                step="0.000001"
                                {...register("exchangeRate", { valueAsNumber: true })}
                            />
                            {errors.exchangeRate && <p className="text-red-500 text-xs mt-1">{errors.exchangeRate.message}</p>}
                        </div>
                    )}
                    {/* Tax & Installment Toggles */}
                    <div className="flex flex-col gap-2 pt-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="includeTax"
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                {...register("includeTax")}
                            />
                            <label htmlFor="includeTax" className="text-sm font-medium cursor-pointer">
                                {dict.Sales.Invoice.Form.IncludeTax}
                            </label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isInstallment"
                                className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                                {...register("isInstallment")}
                            />
                            <label htmlFor="isInstallment" className="text-sm font-bold text-orange-600 cursor-pointer">
                                💳 {dict.Sales.Invoice.Form.IsInstallment}
                            </label>
                        </div>
                    </div>
                </div>

                {/* Installment Details Panel */}
                {isInstallment && (
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-md grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
                        <div>
                            <label className="text-sm font-bold text-orange-800 mb-1 block">{dict.Sales.Invoice.Form.InstallmentMonths}</label>
                            <Input type="number" {...register("installmentCount", { valueAsNumber: true })} min="1" className="bg-white border-orange-200" />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-orange-800 mb-1 block">{dict.Sales.Invoice.Form.InstallmentInterest}</label>
                            <Input type="number" step="0.1" {...register("installmentInterest", { valueAsNumber: true })} min="0" className="bg-white border-orange-200" />
                        </div>
                        <div className="bg-white p-2 rounded border border-orange-200 flex flex-col justify-center items-center">
                            <span className="text-xs text-orange-600 font-bold">{dict.Sales.Invoice.Form.ExpectedMonthlyInstallment}</span>
                            <span className="text-xl font-black text-orange-700 font-mono">
                                {((totals.total - initialPayment) / (installmentCount || 1)).toFixed(2)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Lines Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[30%]">{dict.Sales.Invoice.Form.Table.Item}</TableHead>
                                    <TableHead className="w-[30%]">{dict.Sales.Invoice.Form.Table.Description}</TableHead>
                                    <TableHead className="w-[10%]">{dict.Sales.Invoice.Form.Table.Qty}</TableHead>
                                    <TableHead className="w-[15%]">{dict.Sales.Invoice.Form.Table.Price}</TableHead>
                                    <TableHead className="w-[10%]">{dict.Sales.Invoice.Form.Table.Total}</TableHead>
                                    <TableHead className="w-[5%]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell className="p-2">
                                            <ProductCombobox
                                                products={products}
                                                value={watchedItems[index]?.productId}
                                                onSelect={(val) => {
                                                    setValue(`items.${index}.productId`, val, { shouldValidate: true });
                                                    onProductChange(index, val);
                                                }}
                                                placeholder={dict.Sales.Invoice.Form.SelectProduct}
                                            />
                                            {errors.items?.[index]?.productId && <p className="text-red-500 text-xs">{errors.items[index]?.productId?.message}</p>}
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Input {...register(`items.${index}.description` as const)} />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Input
                                                type="number"
                                                min="1"
                                                {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                {...register(`items.${index}.unitPrice` as const, { valueAsNumber: true })}
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 font-medium">
                                            {((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unitPrice || 0)).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="p-2 text-center">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                <Trash2 size={16} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Footer Actions & Totals */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                        <Button type="button" variant="outline" onClick={() => append({ productId: "", description: "", quantity: 1, unitPrice: 0 })} className="gap-2">
                            <Plus size={16} />
                            <span>{dict.Sales.Invoice.Form.AddItem}</span>
                        </Button>
                    </div>

                    <div className="w-full md:w-80 space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg border space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{dict.Sales.Invoice.Form.Subtotal}:</span>
                                <span className="font-mono">{totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{dict.Sales.Invoice.Form.Tax} (14%):</span>
                                <span className="font-mono">{totals.tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{(dict as any).Sales?.Invoice?.Form?.Discount || "الخصم"}:</span>
                                <Input
                                    type="number"
                                    className="w-24 h-7 text-right font-mono text-xs border-green-200 bg-green-50/10 focus:bg-white"
                                    {...register("discountAmount", { valueAsNumber: true })}
                                />
                            </div>
                            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                                <span>{dict.Sales.Invoice.Form.GrandTotal}:</span>
                                <span className="text-primary font-mono text-xl">{totals.total.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Payment Field - Translated & Auto Filled */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm">
                            <label className="text-sm font-bold text-blue-900 mb-1 block">{dict.Sales.Invoice.Form.PaidAmount}</label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                {...register("initialPayment", { valueAsNumber: true })}
                                className="bg-white text-lg font-bold text-green-700 h-12"
                            />
                            <div className="flex justify-between text-sm mt-2 font-medium bg-white/50 p-2 rounded">
                                <span>{dict.Sales.Invoice.Form.RemainingDue}:</span>
                                <span className={cn(
                                    "font-bold font-mono",
                                    (totals.total - initialPayment) > 0.1 ? "text-red-600" : "text-green-600"
                                )}>
                                    {Math.max(0, totals.total - initialPayment).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end items-center gap-6">
                    {/* Print Layout Toggle */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase text-center block mb-1">
                            {(dict as any).Sales?.Invoice?.Form?.PrintLayout || "نمط الطباعة"}
                        </label>
                        <Tabs value={printLayout} onValueChange={(v: any) => setPrintLayout(v)} className="w-32">
                            <TabsList className="grid grid-cols-2 h-8 w-full">
                                <TabsTrigger value="standard" className="text-[10px] font-bold" title="A4 Layout">A4</TabsTrigger>
                                <TabsTrigger value="thermal" className="text-[10px] font-bold" title="Thermal Layout">📟</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Auto-print Toggle */}
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="auto-print-invoice"
                            checked={autoPrint}
                            onCheckedChange={(val) => setAutoPrint(val as boolean)}
                            className="w-5 h-5"
                        />
                        <Label htmlFor="auto-print-invoice" className="font-bold text-slate-600 cursor-pointer">
                            {(dict as any).Sales?.Invoice?.Form?.AutoPrint || "طباعة تلقائية"}
                        </Label>
                    </div>

                    {createdInvoiceId && (
                        <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            className="gap-2"
                            onClick={() => window.open(`/dashboard/sales/${createdInvoiceId}/print`, '_blank')}
                        >
                            <Printer size={18} />
                            <span>{dict.Sales.Invoice.Form.PrintButton}</span>
                        </Button>
                    )}
                    <Button type="submit" size="lg" className="gap-2 min-w-[150px]" disabled={isSubmitting} title="Press F2 to Save">
                        <Save size={18} />
                        <span>{dict.Sales.Invoice.Form.Submit} (F2)</span>
                    </Button>
                </div>

                {/* Hidden Print Iframe */}
                <iframe
                    ref={printFrameRef}
                    name="invoice_print_frame"
                    title="Invoice Printing"
                    style={{ position: 'fixed', right: '-1000px', bottom: '-1000px', width: '10px', height: '10px', opacity: 0, border: 'none' }}
                />
            </form>
        </div>
    );


}
