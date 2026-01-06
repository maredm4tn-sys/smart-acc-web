"use client";

import { useState, useTransition } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import { deleteSupplier, updateSupplier } from "../actions";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

export function SupplierActions({ supplier }: { supplier: any }) {
    const [isPending, startTransition] = useTransition();
    const [editOpen, setEditOpen] = useState(false);

    const handleDelete = () => {
        if (confirm("هل أنت متأكد من حذف هذا المورد؟")) {
            startTransition(async () => {
                const res = await deleteSupplier(supplier.id);
                if (res.success) toast.success("تم الحذف بنجاح");
                else toast.error("فشل الحذف");
            });
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <Pencil className="mr-2 h-4 w-4" /> تعديل
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                        <Trash className="mr-2 h-4 w-4" /> حذف
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <EditSupplierDialog open={editOpen} setOpen={setEditOpen} supplier={supplier} />
        </>
    );
}

const supplierSchema = z.object({
    name: z.string().min(1, "اسم المورد مطلوب"),
    companyName: z.string().optional(),
    email: z.string().email("البريد غير صحيح").optional().or(z.literal("")),
    phone: z.string().optional(),
    address: z.string().optional(),
    taxId: z.string().optional(),
});
type SupplierFormValues = z.infer<typeof supplierSchema>;

function EditSupplierDialog({ open, setOpen, supplier }: { open: boolean, setOpen: (v: boolean) => void, supplier: any }) {
    const [isPending, startTransition] = useTransition();
    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            name: supplier.name,
            companyName: supplier.companyName || "",
            email: supplier.email || "",
            phone: supplier.phone || "",
            address: supplier.address || "",
            taxId: supplier.taxId || "",
        },
    });

    function onSubmit(data: SupplierFormValues) {
        startTransition(async () => {
            const result = await updateSupplier(supplier.id, data);
            if (result.success) {
                toast.success("تم التعديل بنجاح");
                setOpen(false);
            } else {
                toast.error("فشل التعديل");
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>تعديل بيانات المورد</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>اسم المورد *</Label>
                            <Input {...form.register("name")} />
                            {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>اسم الشركة</Label>
                            <Input {...form.register("companyName")} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>الهاتف</Label>
                            <Input {...form.register("phone")} dir="ltr" />
                        </div>
                        <div className="space-y-2">
                            <Label>الرقم الضريبي</Label>
                            <Input {...form.register("taxId")} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>البريد الإلكتروني</Label>
                        <Input {...form.register("email")} type="email" dir="ltr" />
                    </div>
                    <div className="space-y-2">
                        <Label>العنوان</Label>
                        <Input {...form.register("address")} />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
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
