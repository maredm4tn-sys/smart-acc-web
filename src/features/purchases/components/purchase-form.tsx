"use client";

import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createPurchaseInvoice, updatePurchaseInvoice } from "../actions";
import { useTranslation } from "@/components/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { ProductCombobox } from "@/features/sales/components/product-combobox";

interface ProductOption {
    id: number;
    name: string;
    buyPrice: number; // Cost Price
    sku: string;
}

interface SupplierOption {
    id: number;
    name: string;
}

export function PurchaseForm({ products, suppliers, initialProductId, initialData }: {
    products: ProductOption[],
    suppliers: SupplierOption[],
    initialProductId?: string,
    initialData?: any
}) {
    const { dict: rawDict } = useTranslation();
    const dict = rawDict as any;
    const router = useRouter();
    const [totals, setTotals] = useState({ subtotal: 0, total: 0 });

    const invoiceSchema = z.object({
        supplierId: z.string().min(1, "Supplier Required"), // Use ID for Supplier
        supplierName: z.string().optional(), // For display/fallback
        invoiceNumber: z.string().optional(), // Supplier Invoice No
        issueDate: z.string().min(1, "Date Required"),
        paymentStatus: z.string(), // paid, unpaid
        amountPaid: z.number().min(0).optional(),
        items: z.array(z.object({
            productId: z.string().min(1, "Product Required"),
            description: z.string().optional(),
            quantity: z.number().min(1, "Min Qty 1"),
            unitCost: z.number().min(0, "Min Cost 0"),
        })).min(1, "At least one item required")
    });

    type PurchaseFormValues = z.infer<typeof invoiceSchema>;

    // Find initial product info if provided
    const initialProduct = initialProductId ? products.find(p => p.id.toString() === initialProductId) : null;

    const { control, register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<PurchaseFormValues>({
        resolver: zodResolver(invoiceSchema),
        defaultValues: initialData ? {
            supplierId: initialData.supplierId?.toString() || "",
            issueDate: initialData.issueDate,
            paymentStatus: initialData.paymentStatus || "unpaid",
            amountPaid: parseFloat(initialData.amountPaid || "0"),
            items: initialData.items.map((i: any) => ({
                productId: i.productId?.toString() || "",
                description: i.description || "",
                quantity: parseFloat(i.quantity || "0"),
                unitCost: parseFloat(i.unitCost || "0")
            }))
        } : {
            supplierId: "",
            issueDate: new Date().toISOString().split('T')[0],
            paymentStatus: "unpaid",
            amountPaid: 0,
            items: [
                {
                    productId: initialProductId || "",
                    description: initialProduct?.name || "",
                    quantity: 1,
                    unitCost: initialProduct?.buyPrice || 0
                }
            ]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    const watchedItems = useWatch({ control, name: "items" });
    const amountPaid = useWatch({ control, name: "amountPaid" }) || 0;

    // Calculate totals live
    useEffect(() => {
        const items = watchedItems || [];
        const sub = items.reduce((sum, item) => {
            const qty = Number(item.quantity) || 0;
            const cost = Number(item.unitCost) || 0;
            return sum + (qty * cost);
        }, 0);

        setTotals({ subtotal: sub, total: sub });
    }, [watchedItems]);

    const onProductChange = (index: number, productId: string) => {
        const prod = products.find(p => p.id.toString() === productId);
        if (prod) {
            setValue(`items.${index}.description` as const, prod.name);
            setValue(`items.${index}.unitCost` as const, prod.buyPrice || 0);
        }
    };

    const onSubmit = async (data: PurchaseFormValues) => {
        try {
            // Find supplier name
            const supplier = suppliers.find(s => s.id.toString() === data.supplierId);

            let res;
            const payload = {
                ...data,
                supplierName: supplier?.name || "Unknown",
                totalAmount: totals.total,
                subtotal: totals.subtotal,
                items: data.items.map(i => ({
                    productId: parseInt(i.productId),
                    description: i.description,
                    quantity: i.quantity,
                    unitCost: i.unitCost,
                    total: i.quantity * i.unitCost
                }))
            };

            if (initialData) {
                res = await updatePurchaseInvoice(initialData.id, payload);
            } else {
                res = await createPurchaseInvoice(payload);
            }

            if (res.success) {
                toast.success(initialData ? "تم تحديث الفاتورة بنجاح" : (dict.Purchases.Messages?.Success || "تم حفظ فاتورة المشتريات بنجاح"));
                router.push("/dashboard/purchases");
                router.refresh(); // Ensure list updates
                if (!initialData) reset();
            } else {
                toast.error(res.error || "Error saving invoice");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error creating invoice");
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md bg-gray-50/50">
                <div>
                    <label className="text-sm font-medium mb-1 block">{dict.Purchases.Form.Supplier}</label>
                    <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        {...register("supplierId")}
                    >
                        <option value="">{dict.Purchases.Form.SelectSupplier}</option>
                        {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    {errors.supplierId && <p className="text-red-500 text-xs mt-1">{errors.supplierId.message}</p>}
                </div>
                <div>
                    <label className="text-sm font-medium mb-1 block">{dict.Purchases.Form.Date}</label>
                    <Input type="date" {...register("issueDate")} />
                </div>
                <div>
                    <label className="text-sm font-medium mb-1 block">{dict.Purchases.Form.InvoiceNumber}</label>
                    <Input placeholder="12345" {...register("invoiceNumber")} />
                </div>
                <div>
                    <label className="text-sm font-medium mb-1 block">{dict.Purchases.Form.PaymentStatus}</label>
                    <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        {...register("paymentStatus")}
                    >
                        <option value="unpaid">{dict.Purchases.Table.StatusLabels.Unpaid}</option>
                        <option value="paid">{dict.Purchases.Table.StatusLabels.Paid}</option>
                        <option value="partial">{dict.Purchases.Table.StatusLabels.Partial}</option>
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium mb-1 block">{dict.Purchases.Form.AmountPaid}</label>
                    <Input type="number" step="0.01" {...register("amountPaid", { valueAsNumber: true })} />
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[30%]">{dict.Purchases.Form.Product}</TableHead>
                                <TableHead className="w-[10%]">{dict.Purchases.Form.Quantity}</TableHead>
                                <TableHead className="w-[15%]">{dict.Purchases.Form.Cost}</TableHead>
                                <TableHead className="w-[10%]">{dict.Purchases.Form.Total}</TableHead>
                                <TableHead className="w-[5%]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => (
                                <TableRow key={field.id}>
                                    <TableCell className="p-2">
                                        <ProductCombobox
                                            products={products.map(p => ({ ...p, price: p.buyPrice })) as any} // Map to expect format
                                            value={watchedItems[index]?.productId}
                                            onSelect={(val) => {
                                                setValue(`items.${index}.productId`, val);
                                                onProductChange(index, val);
                                            }}
                                            placeholder={dict.Purchases.Form.SelectProduct}
                                        />
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
                                            {...register(`items.${index}.unitCost` as const, { valueAsNumber: true })}
                                        />
                                    </TableCell>
                                    <TableCell className="p-2 font-medium">
                                        {((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unitCost || 0)).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="p-2 text-center">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-500">
                                            <Trash2 size={16} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex justify-between items-start gap-4">
                <Button type="button" variant="outline" onClick={() => append({ productId: "", description: "", quantity: 1, unitCost: 0 })} className="gap-2">
                    <Plus size={16} />
                    <span>{dict.Purchases.Form.AddItem}</span>
                </Button>

                <div className="w-full md:w-80 space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg border space-y-2">
                        <div className="flex justify-between text-lg font-bold">
                            <span>{dict.Purchases.Form.Total}:</span>
                            <span className="text-primary font-mono text-xl">{totals.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3">
                <Button type="submit" size="lg" className="min-w-[150px]" disabled={isSubmitting}>
                    <Save size={18} className="mr-2" />
                    <span>{dict.Purchases.Form.Save}</span>
                </Button>
            </div>
        </form>
    );
}
