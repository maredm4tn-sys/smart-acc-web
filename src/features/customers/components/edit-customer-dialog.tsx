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

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { User, ShieldCheck } from "lucide-react";

interface EditCustomerDialogProps {
    customer: {
        id: number;
        name: string;
        companyName?: string | null;
        phone?: string | null;
        email?: string | null;
        address?: string | null;
        taxId?: string | null;
        nationalId?: string | null;
        creditLimit?: number | string | null;
        paymentDay?: number | null;
    };
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dict: any;
    representatives?: any[];
}

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"; // Added import

export function EditCustomerDialog({ customer, open, onOpenChange, dict, representatives = [] }: EditCustomerDialogProps) {
    const customerSchema = z.object({
        name: z.string().min(1, dict?.Dialogs?.AddCustomer?.Errors?.NameRequired || "Name is required"),
        companyName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        taxId: z.string().optional(),
        nationalId: z.string().optional(),
        creditLimit: z.coerce.number().optional().default(0),
        paymentDay: z.coerce.number().min(1, dict?.Dialogs?.AddCustomer?.Errors?.PaymentDayMin || "Invalid Day").max(31, dict?.Dialogs?.AddCustomer?.Errors?.PaymentDayMax || "Invalid Day").optional(),
        representativeId: z.coerce.number().optional().nullable(),
    });

    type FormValues = z.infer<typeof customerSchema>;

    const { register, handleSubmit, reset, setValue, formState: { isSubmitting, errors } } = useForm<FormValues>({
        resolver: zodResolver(customerSchema) as any,
        defaultValues: {
            name: customer?.name || "",
            companyName: customer?.companyName || "",
            phone: customer?.phone || "",
            email: customer?.email || "",
            address: customer?.address || "",
            taxId: customer?.taxId || "",
            nationalId: customer?.nationalId || "",
            creditLimit: Number(customer?.creditLimit) || 0,
            paymentDay: customer?.paymentDay || undefined,
            representativeId: (customer as any)?.representativeId || null,
        }
    });

    // Reset form when customer changes
    useEffect(() => {
        if (open && customer) {
            reset({
                name: customer.name || "",
                companyName: customer.companyName || "",
                phone: customer.phone || "",
                email: customer.email || "",
                address: customer.address || "",
                taxId: customer.taxId || "",
                nationalId: customer.nationalId || "",
                creditLimit: Number(customer.creditLimit) || 0,
                paymentDay: customer.paymentDay || undefined,
                representativeId: (customer as any).representativeId || null,
            });
        }
    }, [customer, open, reset]);

    const onSubmit = async (data: FormValues) => {
        const res = await updateCustomer(customer.id, data);
        if (res.success) {
            toast.success(dict?.Customers?.Messages?.ImportSuccess || "Saved successfully");
            onOpenChange(false);
        } else {
            toast.error(res.message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{dict?.Customers?.Table?.Edit || "Edit"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
                    <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid grid-cols-2 w-full">
                            <TabsTrigger value="basic" className="gap-2">
                                <User size={16} />
                                {dict?.Dialogs?.AddCustomer?.BasicInfo || "Basic Info"}
                            </TabsTrigger>
                            <TabsTrigger value="advanced" className="gap-2">
                                <ShieldCheck size={16} />
                                {dict?.Dialogs?.AddCustomer?.AdditionalInfo || "Advanced"}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>{dict?.Dialogs?.AddCustomer?.Name || "Name"}</Label>
                                <Input {...register("name")} placeholder={dict?.Dialogs?.AddCustomer?.Placeholders?.Name || "Name"} />
                                {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>{dict?.Dialogs?.AddCustomer?.Company || "Company"}</Label>
                                <Input {...register("companyName")} placeholder={dict?.Dialogs?.AddCustomer?.Placeholders?.Company || "Company"} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{dict?.Dialogs?.AddCustomer?.Phone || "Phone"}</Label>
                                    <Input {...register("phone")} className="dir-ltr text-left" placeholder={dict?.Dialogs?.AddCustomer?.Placeholders?.Phone || "Phone"} />
                                </div>
                                <div className="space-y-2">
                                    <Label>{dict?.Dialogs?.AddCustomer?.Email || "Email"}</Label>
                                    <Input {...register("email")} placeholder={dict?.Dialogs?.AddCustomer?.Placeholders?.Email || "Email"} className="dir-ltr text-left" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>{dict?.Dialogs?.AddCustomer?.Address || "Address"}</Label>
                                <Input {...register("address")} placeholder={dict?.Dialogs?.AddCustomer?.Placeholders?.Address || "Address"} />
                            </div>
                            <div className="space-y-2">
                                <Label>{dict?.Representatives?.MenuLabel || dict?.Representatives?.Title || "Representative"}</Label>
                                <Select onValueChange={(val) => setValue("representativeId", parseInt(val))} defaultValue={(customer as any)?.representativeId?.toString()}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={dict?.Representatives?.SearchPlaceholder || "Select Representative"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {representatives?.map((rep) => (
                                            <SelectItem key={rep.id} value={rep.id.toString()}>
                                                {rep.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </TabsContent>

                        <TabsContent value="advanced" className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>{dict?.Dialogs?.AddCustomer?.TaxId || "Tax ID"}</Label>
                                <Input {...register("taxId")} className="dir-ltr text-left" placeholder={dict?.Dialogs?.AddCustomer?.Placeholders?.TaxId || "Tax ID"} />
                            </div>
                            <div className="space-y-2">
                                <Label>{dict?.Dialogs?.AddCustomer?.NationalId || "National ID"}</Label>
                                <Input {...register("nationalId")} placeholder={dict?.Dialogs?.AddCustomer?.Placeholders?.NationalId || "National ID"} className="dir-ltr text-left" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{dict?.Dialogs?.AddCustomer?.CreditLimit || "Credit Limit"}</Label>
                                    <Input type="number" {...register("creditLimit")} className="dir-ltr text-left" placeholder={dict?.Dialogs?.AddCustomer?.Placeholders?.CreditLimit || "Limit"} />
                                </div>
                                <div className="space-y-2">
                                    <Label>{dict?.Dialogs?.AddCustomer?.PaymentDay || "Payment Day"}</Label>
                                    <Input type="number" min="1" max="31" {...register("paymentDay")} placeholder={dict?.Dialogs?.AddCustomer?.Placeholders?.PaymentDay || "1-31"} className="dir-ltr text-left" />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            {dict?.Common?.Cancel || "Cancel"}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (dict?.Dialogs?.AddCustomer?.Saving || "Saving...") : (dict?.Dialogs?.AddCustomer?.Save || "Save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

