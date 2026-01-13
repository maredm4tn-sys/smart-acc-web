"use client";

import { useState, useTransition, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Loader2 } from "lucide-react";
import { createRepresentative, updateRepresentative } from "../actions";
import { toast } from "sonner";
import { useTranslation } from "@/components/providers/i18n-provider";

// Reusing schema definition but strictly needed here for RHF
const representativeSchema = z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().optional(),
    address: z.string().optional(),
    type: z.enum(["sales", "delivery"]).default("sales"),
    salary: z.coerce.number().min(0).default(0),
    commissionType: z.enum(["percentage", "fixed_per_invoice"]).default("percentage"),
    commissionRate: z.coerce.number().min(0).default(0),
    notes: z.string().optional(),
});

type RepresentativeFormValues = z.infer<typeof representativeSchema>;

interface Props {
    editMode?: boolean;
    initialData?: any;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AddRepresentativeDialog({ editMode, initialData, open: controlledOpen, onOpenChange: setControlledOpen }: Props) {
    const { dict: rawDict } = useTranslation();
    const dict = rawDict as any;
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const isControlled = typeof controlledOpen !== 'undefined';
    const isOpen = isControlled ? controlledOpen : open;
    const setIsOpen = isControlled ? setControlledOpen! : setOpen;

    const form = useForm<RepresentativeFormValues>({
        resolver: zodResolver(representativeSchema) as any,
        defaultValues: {
            name: "",
            phone: "",
            address: "",
            type: "sales",
            salary: 0,
            commissionType: "percentage",
            commissionRate: 0,
            notes: "",
        },
    });

    useEffect(() => {
        if (editMode && initialData) {
            form.reset({
                name: initialData.name,
                phone: initialData.phone || "",
                address: initialData.address || "",
                type: initialData.type || "sales",
                salary: parseFloat(initialData.salary || "0"),
                commissionType: initialData.commissionType || "percentage",
                commissionRate: parseFloat(initialData.commissionRate || "0"),
                notes: initialData.notes || "",
            });
        } else {
            form.reset({
                name: "",
                phone: "",
                address: "",
                type: "sales",
                salary: 0,
                commissionType: "percentage",
                commissionRate: 0,
                notes: "",
            });
        }
    }, [editMode, initialData, isOpen, form]);

    function onSubmit(data: RepresentativeFormValues) {
        startTransition(async () => {
            let result;
            if (editMode && initialData) {
                result = await updateRepresentative(initialData.id, data);
            } else {
                result = await createRepresentative(data);
            }

            if (result.success) {
                toast.success(dict.Representatives.Dialog.Success);
                setIsOpen(false);
                if (!editMode) form.reset();
            } else {
                toast.error(result.message || dict.Representatives.Dialog.Error);
            }
        });
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {!isControlled && (
                <DialogTrigger asChild>
                    <Button className="gap-2">
                        <PlusCircle size={16} />
                        {dict.Representatives.Dialog.AddTitle}
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{editMode ? dict.Representatives.Dialog.EditTitle : dict.Representatives.Dialog.AddTitle}</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                    <div className="space-y-2">
                        <Label>{dict.Representatives.Dialog.Name} *</Label>
                        <Input {...form.register("name")} />
                        {form.formState.errors.name && (
                            <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{dict.Representatives.Dialog.Phone}</Label>
                            <Input {...form.register("phone")} dir="ltr" className="text-left" />
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Representatives.Dialog.Type}</Label>
                            <Select
                                onValueChange={(val) => form.setValue("type", val as "sales" | "delivery")}
                                defaultValue={form.getValues("type")}
                                value={form.watch("type")}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sales">{dict.Representatives.Types.Sales}</SelectItem>
                                    <SelectItem value="delivery">{dict.Representatives.Types.Delivery}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{dict.Representatives.Dialog.CommissionType}</Label>
                            <Select
                                onValueChange={(val) => form.setValue("commissionType", val as "percentage" | "fixed_per_invoice")}
                                defaultValue={form.getValues("commissionType")}
                                value={form.watch("commissionType")}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percentage">{dict.Representatives.Dialog.Types?.Percentage || "Percentage (%)"}</SelectItem>
                                    <SelectItem value="fixed_per_invoice">{dict.Representatives.Dialog.Types?.Fixed || "Fixed Amount (LE)"}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>
                                {form.watch("commissionType") === "percentage"
                                    ? (dict.Representatives.Dialog.CommissionRate || "Commission (%)")
                                    : (dict.Representatives.Dialog.CommissionValue || "Value (LE)")
                                }
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
                                {...form.register("commissionRate")}
                                dir="ltr"
                                className="text-left"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{dict.Representatives.Dialog.Salary || "Monthly Salary"}</Label>
                            <Input
                                type="number"
                                step="0.01"
                                {...form.register("salary")}
                                dir="ltr"
                                className="text-left"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Representatives.Dialog.Address}</Label>
                            <Input {...form.register("address")} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{dict.Representatives.Dialog.Notes}</Label>
                        <Input {...form.register("notes")} />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                            {dict.Common.Cancel}
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {dict.Representatives.Dialog.Save}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
