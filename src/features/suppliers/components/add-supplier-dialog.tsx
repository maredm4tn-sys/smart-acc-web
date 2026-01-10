"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle, Loader2 } from "lucide-react";
import { createSupplier } from "../actions";
import { toast } from "sonner";
import { useTranslation } from "@/components/providers/i18n-provider";

const supplierSchema = z.object({
    name: z.string().min(1, "Name is required"), // We will handle translation inside component or accept English for schema for now
    companyName: z.string().optional(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    phone: z.string().optional(),
    address: z.string().optional(),
    taxId: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

export function AddSupplierDialog() {
    const { dict: rawDict } = useTranslation();
    const dict = rawDict as any;
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            name: "",
            companyName: "",
            email: "",
            phone: "",
            address: "",
            taxId: "",
        },
    });

    function onSubmit(data: SupplierFormValues) {
        if (!navigator.onLine) {
            startTransition(async () => {
                try {
                    const { queueAction } = await import("@/lib/offline-db");
                    await queueAction('CREATE_SUPPLIER', { ...data, tenantId: "" });
                    const offlineMsg = (dict as any).Common?.Offline?.OfflineSaved || "تم الحفظ محلياً. سيتم الرفع عند توفر الإنترنت.";
                    toast.success(offlineMsg);
                    setOpen(false);
                    form.reset();
                } catch (e) {
                    toast.error("خطأ في الحفظ المحلي");
                }
            });
            return;
        }

        startTransition(async () => {
            const result = await createSupplier(data);
            if (result.success) {
                toast.success(dict.Suppliers.AddDialog.Success);
                setOpen(false);
                form.reset();
            } else {
                toast.error(result.message || dict.Suppliers.AddDialog.Error);
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <PlusCircle size={16} />
                    {dict.Suppliers.AddDialog.Button}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{dict.Suppliers.AddDialog.Title}</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{dict.Suppliers.AddDialog.Name} *</Label>
                            <Input {...form.register("name")} placeholder={dict.Suppliers.AddDialog.Placeholders.Name} />
                            {form.formState.errors.name && (
                                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Suppliers.AddDialog.Company}</Label>
                            <Input {...form.register("companyName")} placeholder={dict.Suppliers.AddDialog.Placeholders.Company} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{dict.Suppliers.AddDialog.Phone}</Label>
                            <Input {...form.register("phone")} placeholder={dict.Suppliers.AddDialog.Placeholders.Phone} dir="ltr" />
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Suppliers.AddDialog.TaxId}</Label>
                            <Input {...form.register("taxId")} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{dict.Suppliers.AddDialog.Email}</Label>
                        <Input {...form.register("email")} type="email" dir="ltr" />
                        {form.formState.errors.email && (
                            <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>{dict.Suppliers.AddDialog.Address}</Label>
                        <Input {...form.register("address")} />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            {dict.Suppliers.AddDialog.Cancel}
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {dict.Suppliers.AddDialog.Save}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
