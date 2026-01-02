"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger, // Keep it exposed if we want to use it as trigger
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
import { createAccount } from "../actions";
import { PlusCircle } from "lucide-react";

import { useTranslation } from "@/components/providers/i18n-provider";

export function AddAccountDialog({ parentAccounts, triggerLabel }: { parentAccounts: { id: number; name: string; code: string }[], triggerLabel?: string }) {
    const [open, setOpen] = useState(false);
    const { dict } = useTranslation();

    const accountSchema = z.object({
        code: z.string().min(1, dict.Dialogs.AddAccount.Errors.CodeRequired).regex(/^\d+$/, "Numbers only"),
        name: z.string().min(3, dict.Dialogs.AddAccount.Errors.NameRequired),
        type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
        parentId: z.string().optional(),
    });

    type AccountFormValues = z.infer<typeof accountSchema>;

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<AccountFormValues>({
        resolver: zodResolver(accountSchema),
        defaultValues: {
            type: "asset",
        },
    });

    const onSubmit = async (data: AccountFormValues) => {
        try {
            const response = await createAccount({
                code: data.code,
                name: data.name,
                type: data.type,
                parentId: data.parentId ? parseInt(data.parentId) : null,
                tenantId: "uuid",
            });

            if (response.success) {
                toast.success(response.message);
                setOpen(false);
                reset();
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <PlusCircle size={16} />
                    <span>{triggerLabel || dict.Dialogs.AddAccount.Title}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{dict.Dialogs.AddAccount.Title}</DialogTitle>
                    <DialogDescription>
                        {dict.Dialogs.AddAccount.Description}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="parentId">{dict.Dialogs.AddAccount.Parent}</Label>
                        <Select onValueChange={(val) => setValue("parentId", val === "none" ? "" : val)}>
                            <SelectTrigger>
                                <SelectValue placeholder={dict.Dialogs.AddAccount.SelectParent} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">-- {dict.Dialogs.AddAccount.SelectParent} --</SelectItem>
                                {parentAccounts.map((acc) => (
                                    <SelectItem key={acc.id} value={acc.id.toString()}>
                                        {acc.code} - {acc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="code">{dict.Dialogs.AddAccount.Code}</Label>
                        <Input id="code" placeholder="ex: 1010" {...register("code")} className="dir-ltr text-left" />
                        {errors.code && <p className="text-sm text-red-500">{errors.code.message}</p>}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="name">{dict.Dialogs.AddAccount.Name}</Label>
                        <Input id="name" placeholder={dict.Dialogs.AddAccount.Name} {...register("name")} />
                        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="type">{dict.Dialogs.AddAccount.Type}</Label>
                        <Select onValueChange={(val: any) => setValue("type", val)} defaultValue="asset">
                            <SelectTrigger>
                                <SelectValue placeholder={dict.Dialogs.AddAccount.SelectType} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="asset">{dict.Dialogs.AddAccount.Types.Asset}</SelectItem>
                                <SelectItem value="liability">{dict.Dialogs.AddAccount.Types.Liability}</SelectItem>
                                <SelectItem value="equity">{dict.Dialogs.AddAccount.Types.Equity}</SelectItem>
                                <SelectItem value="revenue">{dict.Dialogs.AddAccount.Types.Revenue}</SelectItem>
                                <SelectItem value="expense">{dict.Dialogs.AddAccount.Types.Expense}</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? dict.Dialogs.AddAccount.Saving : dict.Dialogs.AddAccount.Save}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
