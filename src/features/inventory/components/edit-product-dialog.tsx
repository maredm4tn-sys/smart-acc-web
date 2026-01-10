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
import { updateProduct, getCategories } from "../actions";
import { Pencil, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { useTranslation } from "@/components/providers/i18n-provider";

export function EditProductDialog({ product }: { product: any }) {
    const [open, setOpen] = useState(false);
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const { dict } = useTranslation();

    useEffect(() => {
        if (open) {
            getCategories().then(setCategories);
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
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: product.name,
            sku: product.sku,
            type: product.type,
            sellPrice: Number(product.sellPrice),
            buyPrice: Number(product.buyPrice),
            stockQuantity: Number(product.stockQuantity),
            requiresToken: Boolean(product.requiresToken),
            categoryId: product.categoryId,
        },
    });

    const onSubmit = async (data: ProductFormValues) => {
        try {
            const response = await updateProduct({
                id: product.id,
                tenantId: product.tenantId,
                ...data,
            });

            if (response.success) {
                toast.success(response.message);
                setOpen(false);
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error("Unexpected error");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Pencil className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{dict.Dialogs.EditProduct.Title}</DialogTitle>
                    <DialogDescription>
                        {dict.Dialogs.EditProduct.Description} {product.name}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="sku">{dict.Dialogs.AddProduct.SKU}</Label>
                            <Input id="sku" {...register("sku")} disabled className="bg-gray-100 dir-ltr text-left" />
                            {errors.sku && <p className="text-sm text-red-500">{errors.sku.message?.toString()}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="type">{dict.Dialogs.AddProduct.Type}</Label>
                            <Select onValueChange={(val: any) => setValue("type", val)} defaultValue={product.type}>
                                <SelectTrigger> <SelectValue /> </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="goods">{dict.Dialogs.AddProduct.Goods}</SelectItem>
                                    <SelectItem value="service">{dict.Dialogs.AddProduct.Service}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">{dict.Dialogs.AddProduct.Category || "Category"}</Label>
                        <Select onValueChange={(val) => setValue("categoryId", Number(val))} defaultValue={product.categoryId?.toString()}>
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
                        <Input id="name" {...register("name")} />
                        {errors.name && <p className="text-sm text-red-500">{errors.name.message?.toString()}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="sellPrice">{dict.Dialogs.AddProduct.SellPrice}</Label>
                            <Input type="number" step="0.01" {...register("sellPrice", { valueAsNumber: true })} className="dir-ltr text-left" />
                            {errors.sellPrice && <p className="text-sm text-red-500">{errors.sellPrice.message?.toString()}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="buyPrice">{dict.Dialogs.AddProduct.BuyPrice}</Label>
                            <Input type="number" step="0.01" {...register("buyPrice", { valueAsNumber: true })} className="dir-ltr text-left" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="stock">{dict.Dialogs.AddProduct.OpeningStock}</Label>
                            <Input type="number" step="1" {...register("stockQuantity", { valueAsNumber: true })} className="dir-ltr text-left" />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? dict.Dialogs.EditProduct.Saving : dict.Dialogs.EditProduct.Save}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
