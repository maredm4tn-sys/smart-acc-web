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

const supplierSchema = z.object({
    name: z.string().min(1, "اسم المورد مطلوب"),
    companyName: z.string().optional(),
    email: z.string().email("البريد غير صحيح").optional().or(z.literal("")),
    phone: z.string().optional(),
    address: z.string().optional(),
    taxId: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

export function AddSupplierDialog() {
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
        startTransition(async () => {
            const result = await createSupplier(data);
            if (result.success) {
                toast.success("تم إضافة المورد بنجاح");
                setOpen(false);
                form.reset();
            } else {
                toast.error("حدث خطأ أثناء الإضافة");
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <PlusCircle size={16} />
                    إضافة مورد
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>إضافة مورد جديد</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>اسم المورد *</Label>
                            <Input {...form.register("name")} placeholder="مثال: محمد علي" />
                            {form.formState.errors.name && (
                                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>اسم الشركة</Label>
                            <Input {...form.register("companyName")} placeholder="مثال: شركة النور" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>الهاتف</Label>
                            <Input {...form.register("phone")} placeholder="01xxxxxxxxx" dir="ltr" />
                        </div>
                        <div className="space-y-2">
                            <Label>الرقم الضريبي</Label>
                            <Input {...form.register("taxId")} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>البريد الإلكتروني</Label>
                        <Input {...form.register("email")} type="email" dir="ltr" />
                        {form.formState.errors.email && (
                            <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>العنوان</Label>
                        <Input {...form.register("address")} />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            إلغاء
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            حفظ
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
