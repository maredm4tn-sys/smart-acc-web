"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { useState } from "react";
import { toast } from "sonner";
import { createCustomer } from "../actions";
import { Plus } from "lucide-react";

import { useTranslation } from "@/components/providers/i18n-provider";

export function AddCustomerDialog({ triggerLabel }: { triggerLabel?: string }) {
    const [open, setOpen] = useState(false);
    const { dict } = useTranslation();

    const customerSchema = z.object({
        name: z.string().min(2, dict.Dialogs.AddCustomer.Errors.NameRequired),
        companyName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        taxId: z.string().optional(),
    });

    type CustomerFormValues = z.infer<typeof customerSchema>;

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CustomerFormValues>({
        resolver: zodResolver(customerSchema)
    });

    const onSubmit = async (data: CustomerFormValues) => {
        if (!navigator.onLine) {
            try {
                const { queueAction } = await import("@/lib/offline-db");
                await queueAction('CREATE_CUSTOMER', { ...data, tenantId: "" });
                const offlineMsg = (dict as any).Common?.Offline?.OfflineSaved || "تم الحفظ محلياً. سيتم الرفع عند توفر الإنترنت.";
                toast.success(offlineMsg);
                reset();
                setOpen(false);
                return;
            } catch (e) {
                toast.error("خطأ في الحفظ المحلي");
                return;
            }
        }

        const res = await createCustomer({ ...data, tenantId: "uuid" });
        if (res.success) {
            toast.success(res.message);
            reset();
            setOpen(false);
        } else {
            toast.error(res.message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center justify-center gap-2 h-10">
                    <Plus size={16} />
                    {triggerLabel || dict.Dialogs.AddCustomer.Title}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{dict.Dialogs.AddCustomer.Title}</DialogTitle>
                    <DialogDescription>
                        {dict.Dialogs.AddCustomer.Description}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit, (e) => toast.error(dict.Users.Dialog.Errors.AllFieldsRequired))} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>{dict.Dialogs.AddCustomer.Name}</Label>
                        <Input {...register("name")} placeholder={dict.Dialogs.AddCustomer.Name} />
                        {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label>{dict.Customers.Table.Company}</Label>
                        <Input {...register("companyName")} placeholder={dict.Customers.Table.Company} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{dict.Dialogs.AddCustomer.Phone}</Label>
                            <Input {...register("phone")} className="dir-ltr text-left" />
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Dialogs.AddCustomer.Email}</Label>
                            <Input {...register("email")} className="dir-ltr text-left" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>{dict.Dialogs.AddCustomer.Address}</Label>
                        <Input {...register("address")} />
                    </div>
                    <div className="space-y-2">
                        <Label>{dict.Dialogs.AddCustomer.TaxId}</Label>
                        <Input {...register("taxId")} className="dir-ltr text-left" />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? dict.Dialogs.AddCustomer.Saving : dict.Dialogs.AddCustomer.Save}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
