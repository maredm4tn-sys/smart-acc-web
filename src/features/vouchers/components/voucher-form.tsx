"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/components/providers/i18n-provider";
import { toast } from "sonner";
import { createVoucher } from "../actions";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Helper Select Component for Accounts
function AccountInternalSelect({ value, onChange, filterType }: { value?: number, onChange: (val: number) => void, filterType?: string }) {
    const { dict } = useTranslation();
    const [list, setList] = useState<{ id: number; name: string, code: string }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchList = async () => {
            setLoading(true);
            try {
                // Determine fetch filters based on broad category or passed string
                // Added timestamp to prevent aggressive caching
                const url = filterType ? `/api/accounts?type=${filterType}&t=${Date.now()}` : `/api/accounts?t=${Date.now()}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    let fetchedList: any[] = data.success ? data.data : [];

                    // Filter: Only block Major Groups (ends with 000). 
                    // Allow sub-groups like 4100 but block roots like 3000.
                    fetchedList = fetchedList.filter(item => {
                        const code = item.code || "";
                        if (code.length >= 4 && code.endsWith('000')) return false;
                        return true;
                    });

                    setList(fetchedList);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchList();
    }, [filterType]);

    return (
        <Select value={value?.toString()} onValueChange={(v) => onChange(Number(v))}>
            <SelectTrigger>
                <SelectValue placeholder={loading ? (dict.Common?.Loading || "...") : (dict.Vouchers?.Form?.SelectParty || "...")} />
            </SelectTrigger>
            <SelectContent>
                {list.length > 0 ? list.map((item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name} <span className="text-xs text-gray-400">({item.code})</span>
                    </SelectItem>
                )) : (
                    <div className="p-2 text-sm text-gray-500 text-center">{dict.Common?.NA || "N/A"}</div>
                )}
            </SelectContent>
        </Select>
    );
}

const formSchema = z.object({
    type: z.enum(['receipt', 'payment']),
    date: z.string(),
    amount: z.coerce.number().positive(),
    description: z.string().optional(),
    reference: z.string().optional(),
    partyType: z.enum(['customer', 'supplier', 'other']),
    partyId: z.coerce.number().optional(),
    accountId: z.coerce.number().optional(),
});

export function VoucherForm({ customers, suppliers }: { customers: any[], suppliers: any[] }) {
    const { dict: rawDict } = useTranslation();
    const router = useRouter();
    const dict = rawDict as any;

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: 'receipt',
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            partyType: 'customer',
            partyId: undefined,
            accountId: undefined,
        }
    });

    const partyType = watch("partyType");
    const type = watch("type");
    const partyId = watch("partyId");

    // Register fields that are controlled manually
    useEffect(() => {
        register("type");
        register("partyType");
        register("partyId");
    }, [register]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (values.partyType !== 'other' && !values.partyId) {
            toast.error(dict.Vouchers?.Form?.SelectParty || "Please select a party");
            return;
        }

        const result = await createVoucher(values);
        if (result.success) {
            toast.success(dict.Common?.Success || "Success");
            router.push("/dashboard/vouchers");
        } else {
            toast.error(result.message);
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{dict.Vouchers?.Form?.Type}</Label>
                    <Select onValueChange={(val) => setValue('type', val as any)} defaultValue={type}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="receipt">{dict.Vouchers?.Receipt}</SelectItem>
                            <SelectItem value="payment">{dict.Vouchers?.Payment}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>{dict.Vouchers?.Form?.Date}</Label>
                    <Input type="date" {...register('date')} />
                    {errors.date && <p className="text-sm text-red-500">{errors.date.message}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{dict.Vouchers?.Form?.PartyType}</Label>
                    <Select onValueChange={(val) => {
                        setValue('partyType', val as any);
                        setValue('partyId', undefined); // Reset partyId
                    }} defaultValue={partyType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="customer">{dict.Vouchers?.Form?.Types?.Customer}</SelectItem>
                            <SelectItem value="supplier">{dict.Vouchers?.Form?.Types?.Supplier}</SelectItem>
                            <SelectItem value="other">{dict.Vouchers?.Form?.Types?.Other}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Customer Selector */}
                {partyType === 'customer' && (
                    <div className="space-y-2">
                        <Label>{dict.Vouchers?.Form?.Party}</Label>
                        <Select onValueChange={(val) => setValue('partyId', Number(val))} value={partyId?.toString()}>
                            <SelectTrigger>
                                <SelectValue placeholder={dict.Vouchers?.Form?.SelectParty} />
                            </SelectTrigger>
                            <SelectContent>
                                {customers.map((c) => (
                                    <SelectItem key={c.id} value={c.id.toString()}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.partyId && <p className="text-sm text-red-500">{errors.partyId.message}</p>}
                    </div>
                )}

                {/* Supplier Selector */}
                {partyType === 'supplier' && (
                    <div className="space-y-2">
                        <Label>{dict.Vouchers?.Form?.Party}</Label>
                        <Select onValueChange={(val) => setValue('partyId', Number(val))} value={partyId?.toString()}>
                            <SelectTrigger>
                                <SelectValue placeholder={dict.Vouchers?.Form?.SelectParty} />
                            </SelectTrigger>
                            <SelectContent>
                                {suppliers.map((s) => (
                                    <SelectItem key={s.id} value={s.id.toString()}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.partyId && <p className="text-sm text-red-500">{errors.partyId.message}</p>}
                    </div>
                )}

                {/* Account Selector (For Other) */}
                {partyType === 'other' && (
                    <div className="space-y-2">
                        <Label>{dict.Vouchers?.Form?.Account || "Account"}</Label>
                        <AccountInternalSelect
                            value={watch('accountId') as number}
                            onChange={(val) => setValue('accountId', val)}
                            // Expand search to all account types to allow equity (3000s), liabilities (2000s), etc.
                            filterType="asset,liability,equity,revenue,expense"
                        />
                        {errors.accountId && <p className="text-sm text-red-500">{dict.Common?.Error || "Error"}</p>}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <Label>{dict.Vouchers?.Form?.Amount}</Label>
                <Input type="number" step="0.01" {...register('amount')} />
                {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{dict.Vouchers?.Form?.Reference}</Label>
                    <Input {...register('reference')} placeholder="e.g. Check No, Receipt No" />
                </div>

                <div className="space-y-2">
                    <Label>{dict.Vouchers?.Form?.Description}</Label>
                    <Input {...register('description')} />
                </div>
            </div>

            <Button type="submit" className="w-full">
                {dict.Vouchers?.Form?.Save}
            </Button>
        </form>
    );
}
