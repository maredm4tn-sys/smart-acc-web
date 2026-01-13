"use client";

import { Button } from "@/components/ui/button";
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
import { useState, useRef } from "react";
import { updateSettings } from "../actions";
import { Save, Upload, Building2, Phone, MapPin, Receipt, Coins, Printer } from "lucide-react";
import Image from "next/image";
import { useTranslation } from "@/components/providers/i18n-provider";

export function SettingsForm({ initialData }: { initialData: any }) {
    const { dict } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.logoUrl || null);

    const settingsSchema = z.object({
        name: z.string().min(2, dict.Settings.Form.NameRequired),
        phone: z.string().optional(),
        address: z.string().optional(),
        taxId: z.string().optional(),
        currency: z.string().min(1, dict.Settings.Form.CurrencyRequired),
        logoUrl: z.string().optional(),
        defaultPrintSales: z.enum(['standard', 'thermal']),
        defaultPrintPOS: z.enum(['standard', 'thermal']),
    });

    type SettingsFormValues = z.infer<typeof settingsSchema>;

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            name: initialData?.name || "",
            phone: initialData?.phone || "",
            address: initialData?.address || "",
            taxId: initialData?.taxId || "",
            currency: initialData?.currency || "EGP",
            logoUrl: initialData?.logoUrl || "",
            defaultPrintSales: (initialData?.defaultPrintSales as any) || "standard",
            defaultPrintPOS: (initialData?.defaultPrintPOS as any) || "thermal",
        },
    });

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check size (e.g. 1MB limit)
            if (file.size > 1024 * 1024) {
                toast.error("File is too large. Please use an image smaller than 1MB.");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setLogoPreview(base64String);
                setValue("logoUrl", base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = async (data: SettingsFormValues) => {
        try {
            const res = await updateSettings({
                ...data,
                tenantId: initialData?.id || "uuid",
            });

            if (res.success) {
                toast.success(dict.Settings.Form.Success);
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error(dict.Settings.Form.Error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Right Column: Logo & General */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-lg border shadow-sm text-center">
                        <Label className="block mb-4 text-lg font-semibold">{dict.Settings.Form.Logo}</Label>
                        <div
                            className="mx-auto w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden cursor-pointer hover:bg-gray-100 transition-colors relative group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {logoPreview ? (
                                <img src={logoPreview} alt="Company Logo" className="w-full h-full object-contain" />
                            ) : (
                                <div className="text-gray-400 flex flex-col items-center">
                                    <Upload size={24} className="mb-2" />
                                    <span className="text-xs">{dict.Settings.Form.Upload}</span>
                                </div>
                            )}
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                {dict.Settings.Form.Change}
                            </div>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleLogoUpload}
                        />
                        <p className="text-xs text-muted-foreground mt-4 whitespace-pre-wrap">
                            {dict.Settings.Form.PreferredSize}
                        </p>
                    </div>
                </div>

                {/* Left Column: Form Fields */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-2 mb-4">
                            <Building2 size={20} className="text-primary" />
                            {dict.Settings.Form.CompanyDetails}
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{dict.Settings.Form.Name} <span className="text-red-500">*</span></Label>
                                <Input id="name" {...register("name")} placeholder={dict.Settings.Form.Placeholders.Name} />
                                {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">{dict.Settings.Form.Phone}</Label>
                                <div className="relative">
                                    <Phone className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input id="phone" {...register("phone")} className="pr-9" placeholder={dict.Settings.Form.Placeholders.Phone} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">{dict.Settings.Form.Address}</Label>
                            <div className="relative">
                                <MapPin className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                                <Input id="address" {...register("address")} className="pr-9" placeholder={dict.Settings.Form.Placeholders.Address} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="taxId">{dict.Settings.Form.TaxId}</Label>
                                <div className="relative">
                                    <Receipt className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input id="taxId" {...register("taxId")} className="pr-9" placeholder={dict.Settings.Form.Placeholders.TaxId} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="currency">{dict.Settings.Form.Currency}</Label>
                                <div className="relative">
                                    <Coins className="absolute right-3 top-3 h-4 w-4 text-gray-400 z-10" />
                                    <Select
                                        defaultValue={initialData?.currency || "EGP"}
                                        onValueChange={(val) => setValue("currency", val)}
                                    >
                                        <SelectTrigger className="pr-9">
                                            <SelectValue placeholder={dict.Settings.Form.SelectCurrency} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="EGP">{dict.Settings.Form.Currencies.EGP}</SelectItem>
                                            <SelectItem value="SAR">{dict.Settings.Form.Currencies.SAR}</SelectItem>
                                            <SelectItem value="USD">{dict.Settings.Form.Currencies.USD}</SelectItem>
                                            <SelectItem value="EUR">{dict.Settings.Form.Currencies.EUR}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {errors.currency && <p className="text-red-500 text-xs">{errors.currency.message}</p>}
                            </div>
                        </div>

                        {/* Printing Defaults Section */}
                        <div className="pt-4 border-t">
                            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                <Printer size={20} className="text-primary" />
                                {(dict as any).Settings?.Form?.PrintSettings || "إعدادات الطباعة"}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{(dict as any).Settings?.Form?.DefaultPrintSales || "الافتراضي للمبيعات (الفاتورة)"}</Label>
                                    <Select
                                        defaultValue={initialData?.defaultPrintSales || "standard"}
                                        onValueChange={(val) => setValue("defaultPrintSales", val as any)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="standard">A4 (رسمي)</SelectItem>
                                            <SelectItem value="thermal">Thermal (حراري)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{(dict as any).Settings?.Form?.DefaultPrintPOS || "الافتراضي لنقطة البيع (POS)"}</Label>
                                    <Select
                                        defaultValue={initialData?.defaultPrintPOS || "thermal"}
                                        onValueChange={(val) => setValue("defaultPrintPOS", val as any)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="standard">A4 (رسمي)</SelectItem>
                                            <SelectItem value="thermal">Thermal (حراري)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <Button type="submit" size="lg" className="gap-2 min-w-[150px]" disabled={isSubmitting}>
                            <Save size={18} />
                            <span>{isSubmitting ? dict.Settings.Form.Saving : dict.Settings.Form.Save}</span>
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
}
