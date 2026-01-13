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
import { MoreHorizontal, Pencil, Trash, FileText } from "lucide-react";
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
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

export function SupplierActions({ supplier, dict }: { supplier: any, dict: any }) {
    const [isPending, startTransition] = useTransition();
    const [editOpen, setEditOpen] = useState(false);

    const handleDelete = () => {
        if (confirm(dict.Suppliers.AddDialog.DeleteConfirm)) {
            startTransition(async () => {
                const res = await deleteSupplier(supplier.id);
                if (res.success) toast.success(dict.Suppliers.AddDialog.DeleteSuccess);
                else toast.error(dict.Suppliers.AddDialog.DeleteError);
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
                    <DropdownMenuLabel>{dict.Suppliers.Table.Actions}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <Pencil className="mr-2 h-4 w-4" /> {dict.Suppliers.Table.Edit}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.location.href = `/dashboard/suppliers/${supplier.id}`}>
                        <FileText className="mr-2 h-4 w-4" /> {dict.Suppliers.Statement.Title}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                        <Trash className="mr-2 h-4 w-4" /> {dict.Suppliers.Table.Delete}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <EditSupplierDialog open={editOpen} setOpen={setEditOpen} supplier={supplier} dict={dict} />
        </>
    );
}

const supplierSchema = z.object({
    name: z.string().min(1, "Name is required"),
    companyName: z.string().optional().nullable(),
    email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    taxId: z.string().optional().nullable(),
    openingBalance: z.coerce.number().default(0),
});
type SupplierFormValues = z.infer<typeof supplierSchema>;

function EditSupplierDialog({ open, setOpen, supplier, dict }: { open: boolean, setOpen: (v: boolean) => void, supplier: any, dict: any }) {
    const [isPending, startTransition] = useTransition();
    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierSchema) as any,
        defaultValues: {
            name: supplier.name,
            companyName: supplier.companyName || "",
            email: supplier.email || "",
            phone: supplier.phone || "",
            address: supplier.address || "",
            taxId: supplier.taxId || "",
            openingBalance: Number(supplier.openingBalance) || 0,
        },
    });

    const onSubmit: SubmitHandler<SupplierFormValues> = async (data) => {
        startTransition(async () => {
            const result = await updateSupplier(supplier.id, data);
            if (result.success) {
                toast.success(dict.Suppliers.EditDialog.Success);
                setOpen(false);
            } else {
                toast.error(dict.Suppliers.EditDialog.Error);
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{dict.Suppliers.EditDialog.Title}</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{dict.Suppliers.AddDialog.Name} *</Label>
                            <Input {...form.register("name")} />
                            {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Suppliers.AddDialog.Company}</Label>
                            <Input {...form.register("companyName")} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{dict.Suppliers.AddDialog.Phone}</Label>
                            <Input {...form.register("phone")} dir="ltr" />
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Suppliers.AddDialog.TaxId}</Label>
                            <Input {...form.register("taxId")} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{dict.Suppliers.AddDialog.OpeningBalance}</Label>
                            <Input type="number" step="0.01" {...form.register("openingBalance")} dir="ltr" className="text-left" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>{dict.Suppliers.AddDialog.Email}</Label>
                        <Input {...form.register("email")} type="email" dir="ltr" />
                    </div>
                    <div className="space-y-2">
                        <Label>{dict.Suppliers.AddDialog.Address}</Label>
                        <Input {...form.register("address")} />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>{dict.Suppliers.AddDialog.Cancel}</Button>
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
