"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { updateCustomer } from "../actions";

interface EditCustomerDialogProps {
    customer: {
        id: number;
        name: string;
        companyName?: string | null;
        phone?: string | null;
        email?: string | null;
        address?: string | null;
        taxId?: string | null;
    };
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditCustomerDialog({ customer, open, onOpenChange }: EditCustomerDialogProps) {
    const customerSchema = z.object({
        name: z.string().min(1, "Name required"),
        companyName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        taxId: z.string().optional(),
    });

    type FormValues = z.infer<typeof customerSchema>;

    const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            name: customer.name,
            companyName: customer.companyName || "",
            phone: customer.phone || "",
            email: customer.email || "",
            address: customer.address || "",
            taxId: customer.taxId || "",
        }
    });

    // Reset form when customer changes
    useEffect(() => {
        if (open) {
            reset({
                name: customer.name,
                companyName: customer.companyName || "",
                phone: customer.phone || "",
                email: customer.email || "",
                address: customer.address || "",
                taxId: customer.taxId || "",
            });
        }
    }, [customer, open, reset]);

    const onSubmit = async (data: FormValues) => {
        const res = await updateCustomer(customer.id, data);
        if (res.success) {
            toast.success("Customer Updated");
            onOpenChange(false);
        } else {
            toast.error(res.message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Customer: {customer.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input {...register("name")} />
                    </div>
                    <div className="space-y-2">
                        <Label>Company</Label>
                        <Input {...register("companyName")} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input {...register("phone")} className="dir-ltr text-left" />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input {...register("email")} className="dir-ltr text-left" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Address</Label>
                        <Input {...register("address")} />
                    </div>
                    <div className="space-y-2">
                        <Label>Tax ID</Label>
                        <Input {...register("taxId")} className="dir-ltr text-left" />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
