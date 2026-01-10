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
    const { dict } = useTranslation();

    const fetchCategories = async () => {
        const cats = await getCategories();
        setCategories(cats);
    };

    useEffect(() => {
        if (open) {
            fetchCategories();
        }
    }, [open]);

    const productSchema = z.object({
        name: z.string().min(2, dict.Dialogs.AddProduct.Errors.NameRequired),
        sku: z.string().min(1, dict.Dialogs.AddProduct.Errors.SKURequired),
        type: z.enum(["goods", "service"]),
        sellPrice: z.coerce.number().min(0, dict.Dialogs.AddProduct.Errors.PricePositive),
        buyPrice: z.coerce.number().min(0).default(0),
        stockQuantity: z.coerce.number().min(0).default(0),
        requiresToken: z.boolean().default(false),
        categoryId: z.number().optional(),
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
            buyPrice: 0,
            stockQuantity: 0,
            requiresToken: false,
        },
    });

    const onSubmit = async (data: ProductFormValues) => {
        console.log("Submitting form data:", data);
        try {
            const response = await createProduct({
                ...data,
                tenantId: "", // Let server resolve it
            });

            console.log("Server response:", response);

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

    const onError = (errors: any) => {
        console.error("Form validation errors:", errors);
        toast.error("يرجى التأكد من ملء جميع الحقول المطلوبة بشكل صحيح");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <PlusCircle size={16} />
                    <span>{triggerLabel || dict.Dialogs.AddProduct.Title}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{dict.Dialogs.AddProduct.Title}</DialogTitle>
                    <DialogDescription>
                        {dict.Dialogs.AddProduct.Description}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="sku">{dict.Dialogs.AddProduct.SKU}</Label>
                            <Input id="sku" placeholder="ex: PROD-001" {...register("sku")} className="text-left dir-ltr" />
                            {errors.sku && <p className="text-sm text-red-500">{errors.sku.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="type">{dict.Dialogs.AddProduct.Type}</Label>
                            <Select onValueChange={(val: any) => setValue("type", val)} defaultValue="goods">
                                <SelectTrigger> <SelectValue /> </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="goods">{dict.Dialogs.AddProduct.Goods}</SelectItem>
                                    <SelectItem value="service">{dict.Dialogs.AddProduct.Service}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 space-x-reverse bg-slate-50 p-2 rounded-md border border-dashed">
                        <input
                            type="checkbox"
                            id="requiresToken"
                            {...register("requiresToken")}
                            className="w-4 h-4 accent-blue-600"
                        />
                        <Label htmlFor="requiresToken" className="cursor-pointer text-xs">
                            {dict.Inventory.Table.RequiresToken || "إصدار رقم دور لهذا الصنف تلقائياً"}
                        </Label>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="category">{dict.Dialogs.AddProduct.Category || "Category"}</Label>
                            <CategoryManagerDialog onCategoryAdded={fetchCategories} trigger={<Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-blue-600"><PlusCircle className="mr-1 h-3 w-3" /> {dict.Dialogs.AddProduct.New || "New"}</Button>} />
                        </div>
                        <Select onValueChange={(val) => setValue("categoryId", Number(val))}>
                            <SelectTrigger>
                                <SelectValue placeholder={dict.Dialogs.AddProduct.SelectCategory || "Select Category..."} />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((c) => (
                                    <SelectItem key={c.id} value={c.id.toString()}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">{dict.Dialogs.AddProduct.Name}</Label>
                        <Input id="name" placeholder={dict.Dialogs.AddProduct.Name} {...register("name")} />
                        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="sellPrice">{dict.Dialogs.AddProduct.SellPrice}</Label>
                            <Input
                                id="sellPrice"
                                type="number"
                                step="0.01"
                                {...register("sellPrice", { valueAsNumber: true })}
                                className="text-left dir-ltr"
                            />
                            {errors.sellPrice && <p className="text-sm text-red-500">{errors.sellPrice.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="buyPrice">{dict.Dialogs.AddProduct.BuyPrice}</Label>
                            <Input
                                id="buyPrice"
                                type="number"
                                step="0.01"
                                {...register("buyPrice", { valueAsNumber: true })}
                                className="text-left dir-ltr"
                            />
                            {errors.buyPrice && <p className="text-sm text-red-500">{errors.buyPrice.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="stock">{dict.Dialogs.AddProduct.OpeningStock}</Label>
                            <Input
                                id="stock"
                                type="number"
                                step="1"
                                {...register("stockQuantity", { valueAsNumber: true })}
                                className="text-left dir-ltr"
                            />
                            {errors.stockQuantity && <p className="text-sm text-red-500">{errors.stockQuantity.message}</p>}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? dict.Dialogs.AddProduct.Saving : dict.Dialogs.AddProduct.Save}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    );
}
