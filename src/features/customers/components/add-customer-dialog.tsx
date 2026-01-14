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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { CreditCard, User, ShieldCheck } from "lucide-react";

import { useTranslation } from "@/components/providers/i18n-provider";

export function AddCustomerDialog({ triggerLabel, representatives = [] }: { triggerLabel?: string, representatives?: any[] }) {
    const [open, setOpen] = useState(false);
    const { dict } = useTranslation();

    const customerSchema = z.object({
        name: z.string().min(2, dict?.Dialogs?.AddCustomer?.Errors?.NameRequired || "Name is required"),
        companyName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        taxId: z.string().optional(),
        nationalId: z.string().optional(),
        creditLimit: z.coerce.number().optional().default(0),
        paymentDay: z.coerce.number().min(1).max(31).optional(),
        openingBalance: z.coerce.number().optional().default(0),
        priceLevel: z.enum(['retail', 'wholesale', 'half_wholesale', 'special']),
        representativeId: z.coerce.number().optional().nullable(), // Added
    });

    type CustomerFormValues = z.infer<typeof customerSchema>;

    const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            openingBalance: 0,
            priceLevel: 'retail' as 'retail' | 'wholesale' | 'half_wholesale' | 'special',
            representativeId: null
        }
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
        console.log("🧩 [Client View] createCustomer response:", res);
        if (res.success) {
            toast.success(res.message);
            reset();
            setOpen(false);
        } else {
            console.error("❌ Submission failed:", res);
            toast.error(res.message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center justify-center gap-2 h-10">
                    <Plus size={16} />
                    {triggerLabel || dict?.Dialogs?.AddCustomer?.Title || "Add Customer"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{dict?.Dialogs?.AddCustomer?.Title || "Add New Customer"}</DialogTitle>
                    <DialogDescription>
                        {dict?.Dialogs?.AddCustomer?.Description || "Enter customer details"}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit, (e) => toast.error(dict?.Users?.Dialog?.Errors?.AllFieldsRequired || "All fields required"))} className="space-y-4 py-2">
                    <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="basic" className="flex items-center gap-2">
                                <User size={14} />
                                {dict?.Dialogs?.AddCustomer?.BasicInfo || "Basic"}
                            </TabsTrigger>
                            <TabsTrigger value="advanced" className="flex items-center gap-2">
                                <ShieldCheck size={14} />
                                {dict?.Dialogs?.AddCustomer?.AdditionalInfo || "Advanced"}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>{dict?.Dialogs?.AddCustomer?.Name || "Name"}</Label>
                                <Input {...register("name")} placeholder={dict?.Dialogs?.AddCustomer?.Placeholders?.Name || "Name"} />
                                {errors.name && <p className="text-red-500 text-xs">{errors.name.message as string}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{dict?.Dialogs?.AddCustomer?.Phone || "Phone"}</Label>
                                    <Input {...register("phone")} className="dir-ltr text-left" />
                                </div>
                                <div className="space-y-2">
                                    <Label>{dict?.Dialogs?.AddCustomer?.OpeningBalance || "Opening Balance"}</Label>
                                    <Input type="number" step="0.01" {...register("openingBalance")} className="dir-ltr text-left" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>{dict?.Dialogs?.AddCustomer?.Address || "Address"}</Label>
                                <Input {...register("address")} />
                            </div>
                            <div className="space-y-2">
                                <Label>{dict?.Dialogs?.AddCustomer?.PriceLevel || "Price Level"}</Label>
                                <Select onValueChange={(val: any) => setValue("priceLevel", val)} defaultValue="retail">
                                    <SelectTrigger>
                                        <SelectValue placeholder={dict?.Dialogs?.AddCustomer?.PriceLevelPlaceholder || "Select Level"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="retail">{dict?.Dialogs?.AddCustomer?.Retail || "Retail"}</SelectItem>
                                        <SelectItem value="wholesale">{dict?.Dialogs?.AddCustomer?.Wholesale || "Wholesale"}</SelectItem>
                                        <SelectItem value="half_wholesale">{dict?.Dialogs?.AddCustomer?.HalfWholesale || "Half Wholesale"}</SelectItem>
                                        <SelectItem value="special">{dict?.Dialogs?.AddCustomer?.Special || "Special"}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{(dict as any).Representatives?.MenuLabel || "Representative"}</Label>
                                <Select onValueChange={(val) => setValue("representativeId", parseInt(val))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={(dict as any).Representatives?.SearchPlaceholder || "Select Representative"} />
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

                        <TabsContent value="advanced" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>{dict?.Dialogs?.AddCustomer?.Company || "Company"}</Label>
                                <Input {...register("companyName")} placeholder={dict?.Dialogs?.AddCustomer?.Placeholders?.Company || "Company"} />
                            </div>
                            <div className="space-y-2">
                                <Label>{dict?.Dialogs?.AddCustomer?.TaxId || "Tax ID"}</Label>
                                <Input {...register("taxId")} className="dir-ltr text-left" />
                            </div>
                            <div className="space-y-2">
                                <Label>{dict?.Dialogs?.AddCustomer?.NationalId || "National ID"}</Label>
                                <Input {...register("nationalId")} placeholder={dict?.Dialogs?.AddCustomer?.NationalIdPlaceholder || "Enter ID"} className="dir-ltr text-left" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{dict?.Dialogs?.AddCustomer?.CreditLimit || "Credit Limit"}</Label>
                                    <Input type="number" {...register("creditLimit")} className="dir-ltr text-left" />
                                </div>
                                <div className="space-y-2">
                                    <Label>{dict?.Dialogs?.AddCustomer?.PaymentDay || "Payment Day"}</Label>
                                    <Input type="number" min="1" max="31" {...register("paymentDay")} placeholder={dict?.Dialogs?.AddCustomer?.PaymentDayPlaceholder || "1-31"} className="dir-ltr text-left" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>{dict?.Dialogs?.AddCustomer?.Email || "Email"}</Label>
                                <Input {...register("email")} className="dir-ltr text-left" placeholder={dict?.Dialogs?.AddCustomer?.Placeholders?.Email || "example@mail.com"} />
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-6">
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? (dict?.Dialogs?.AddCustomer?.Saving || "Saving...") : (dict?.Dialogs?.AddCustomer?.Save || "Save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
