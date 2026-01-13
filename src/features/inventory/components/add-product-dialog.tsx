"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { createProduct, getCategories } from "../actions";
import { PlusCircle, Package, RefreshCw } from "lucide-react";
import { CategoryManagerDialog } from "./category-manager-dialog";
import { useEffect } from "react";

import { useTranslation } from "@/components/providers/i18n-provider";

export function AddProductDialog({ triggerLabel }: { triggerLabel?: string }) {
    const [open, setOpen] = useState(false);
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [units, setUnits] = useState<{ id: number; name: string }[]>([]); // Units State
    const { dict } = useTranslation();

    const fetchCategories = async () => {
        const cats = await getCategories();
        setCategories(cats);
    };

    const fetchUnits = async () => {
        const { getUnits } = await import("../actions"); // Dynamic import to avoid cycles if any
        const u = await getUnits();
        setUnits(u);
    };

    useEffect(() => {
        if (open) {
            fetchCategories();
            fetchUnits();
        }
    }, [open]);

    const productSchema = z.object({
        name: z.string().min(2, dict.Dialogs.AddProduct.Errors.NameRequired),
        sku: z.string().min(1, dict.Dialogs.AddProduct.Errors.SKURequired),
        barcode: z.string().optional(),
        type: z.enum(["goods", "service"]),
        sellPrice: z.coerce.number().min(0),
        priceWholesale: z.coerce.number().min(0).default(0),
        priceHalfWholesale: z.coerce.number().min(0).default(0),
        priceSpecial: z.coerce.number().min(0).default(0),
        buyPrice: z.coerce.number().min(0).default(0),
        stockQuantity: z.coerce.number().min(0).default(0),
        minStock: z.coerce.number().min(0).default(0),
        location: z.string().optional(),
        requiresToken: z.boolean().default(false),
        categoryId: z.number().optional(),
        unitId: z.number().optional(),
    });

    type ProductFormValues = z.infer<typeof productSchema>;

    const {
        register,
        handleSubmit,
        setValue,
        setError,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(productSchema),
        defaultValues: {
            type: "goods",
            sellPrice: 0,
            priceWholesale: 0,
            priceHalfWholesale: 0,
            priceSpecial: 0,
            buyPrice: 0,
            stockQuantity: 0,
            minStock: 0,
            requiresToken: false,
        },
    });

    const onSubmit = async (data: ProductFormValues) => {
        // ... (Keep existing offline/online logic) ...
        // --- Offline Handling ---
        if (!navigator.onLine) {
            try {
                const { queueAction } = await import("@/lib/offline-db");
                await queueAction('CREATE_PRODUCT', {
                    ...data,
                    tenantId: "", // Will be filled by server on sync
                });
                const offlineMsg = (dict as any).Common?.Offline?.OfflineSaved || "تم الحفظ محلياً. سيتم الرفع عند توفر الإنترنت.";
                toast.success(offlineMsg);
                setOpen(false);
                reset();
                return;
            } catch (e) {
                toast.error("خطأ في الحفظ المحلي");
                return;
            }
        }

        try {
            const response = await createProduct({
                ...data,
                tenantId: "", // Let server resolve it
            });

            if (response.success) {
                toast.success(response.message);
                setOpen(false);
                reset();
            } else {
                if (response.field === "sku") {
                    setError("sku", { message: response.message });
                } else {
                    toast.error(response.message || dict.Settings.Form.Error);
                }
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error(dict.Settings.Form.Error);
        }
    };

    const generateSKU = () => {
        const random = String(Math.floor(100000 + Math.random() * 900000));
        setValue("sku", random);
    };

    const handleAddUnit = async () => {
        const name = prompt("Enter Unit Name (اسم الوحدة):");
        if (name) {
            const { createUnit } = await import("../actions");
            const res = await createUnit(name);
            if (res.success) {
                toast.success("Unit added");
                fetchUnits();
            } else {
                toast.error("Failed to add unit");
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 text-white border-0">
                    <PlusCircle size={18} />
                    <span className="font-bold">{triggerLabel || dict.Dialogs.AddProduct.Title}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-100 p-2 rounded-lg"><Package className="h-6 w-6 text-indigo-600" /></div>
                        <div>
                            <DialogTitle className="text-xl">{dict.Dialogs.AddProduct.Title}</DialogTitle>
                            <DialogDescription>{dict.Dialogs.AddProduct.Description}</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-6 space-y-2">
                            <Label htmlFor="name" className="text-base">{dict.Dialogs.AddProduct.Name} <span className="text-red-500">*</span></Label>
                            <Input id="name" placeholder={dict.Dialogs.AddProduct.Name} {...register("name")} className="h-10" />
                            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                        </div>

                        <div className="md:col-span-3 space-y-2">
                            <Label htmlFor="sku">كود (SKU) <span className="text-red-500">*</span></Label>
                            <div className="flex">
                                <Input id="sku" placeholder="AUTO" {...register("sku")} className="h-10 rounded-e-none border-e-0 text-center font-mono" />
                                <Button type="button" variant="outline" size="icon" onClick={generateSKU} title="Generate SKU" className="h-10 w-10 rounded-s-none border-s bg-slate-50 hover:bg-slate-100">
                                    <RefreshCw className="h-4 w-4 text-slate-600" />
                                </Button>
                            </div>
                            {errors.sku && <p className="text-sm text-red-500">{errors.sku.message}</p>}
                        </div>

                        <div className="md:col-span-3 space-y-2">
                            <Label htmlFor="barcode">الباركود</Label>
                            <Input id="barcode" placeholder="Scan..." {...register("barcode")} className="h-10 text-center bg-slate-50 border-slate-200" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>{dict.Dialogs.AddProduct.Category}</Label>
                            <div className="flex gap-2">
                                <Select onValueChange={(val) => setValue("categoryId", Number(val))}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="اختر المجموعة..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <CategoryManagerDialog onCategoryAdded={fetchCategories} trigger={<Button type="button" variant="outline" size="icon" className="shrink-0"><PlusCircle className="h-4 w-4" /></Button>} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>الوحدة (Unit)</Label>
                            <div className="flex gap-2">
                                <Select onValueChange={(val) => setValue("unitId", Number(val))}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="قطعة، كرتونة..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {units.map((u) => (
                                            <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button type="button" onClick={handleAddUnit} variant="outline" size="icon" className="shrink-0"><PlusCircle className="h-4 w-4" /></Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{dict.Dialogs.AddProduct.Type}</Label>
                            <Select onValueChange={(val: any) => setValue("type", val)} defaultValue="goods">
                                <SelectTrigger> <SelectValue /> </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="goods">{dict.Dialogs.AddProduct.Goods}</SelectItem>
                                    <SelectItem value="service">{dict.Dialogs.AddProduct.Service}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Pricing Section - Colorful */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                            <span>💰</span> الأسعار والتكلفة
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="buyPrice" className="text-slate-600 text-xs">سعر الشراء</Label>
                                <Input id="buyPrice" type="number" step="0.01" {...register("buyPrice", { valueAsNumber: true })} className="bg-white border-slate-300" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sellPrice" className="text-green-700 font-bold text-xs">سعر البيع (قطاعي)</Label>
                                <Input id="sellPrice" type="number" step="0.01" {...register("sellPrice", { valueAsNumber: true })} className="bg-white border-green-300 focus:ring-green-500 font-bold text-green-700" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="priceWholesale" className="text-blue-700 font-medium text-xs">سعر الجملة</Label>
                                <Input id="priceWholesale" type="number" step="0.01" {...register("priceWholesale", { valueAsNumber: true })} className="bg-white border-blue-200" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="priceHalfWholesale" className="text-indigo-700 font-medium text-xs">نصف جملة</Label>
                                <Input id="priceHalfWholesale" type="number" step="0.01" {...register("priceHalfWholesale", { valueAsNumber: true })} className="bg-white border-indigo-200" />
                            </div>
                        </div>
                    </div>

                    {/* Inventory Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="stockQuantity">الرصيد الافتتاحي</Label>
                            <Input id="stockQuantity" type="number" {...register("stockQuantity", { valueAsNumber: true })} className="text-center font-bold" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="minStock">حد الطلب (Minimum)</Label>
                            <Input id="minStock" type="number" {...register("minStock", { valueAsNumber: true })} className="text-center" placeholder="0" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location">المكان / الرف</Label>
                            <Input id="location" placeholder="A-12" {...register("location")} className="text-center" />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 space-x-reverse pt-2">
                        <input type="checkbox" id="requiresToken" {...register("requiresToken")} className="w-4 h-4 accent-blue-600 rounded" />
                        <Label htmlFor="requiresToken" className="cursor-pointer text-sm text-slate-600">
                            {dict.Inventory.Table.RequiresToken || "يستخدم الدفع المسبق (Token) في الكافيتريا"}
                        </Label>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>{dict.Common.Cancel}</Button>
                        <Button type="submit" disabled={isSubmitting} className="min-w-[120px] bg-green-600 hover:bg-green-700">
                            {isSubmitting ? dict.Dialogs.AddProduct.Saving : dict.Dialogs.AddProduct.Save}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
