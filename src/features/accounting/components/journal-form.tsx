"use client";

import { useTranslation } from "@/components/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Schema
const journalEntrySchema = z.object({
    date: z.string().min(1, "التاريخ مطلوب"),
    description: z.string().optional(),
    lines: z.array(z.object({
        accountId: z.string().min(1, "الحساب مطلوب"),
        description: z.string().optional(),
        debit: z.number().min(0),
        credit: z.number().min(0),
    })).min(2, "يجب أن يحتوي القيد على طرفين على الأقل")
        .refine((items) => {
            const totalDebit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
            const totalCredit = items.reduce((sum, item) => sum + (item.credit || 0), 0);
            return Math.abs(totalDebit - totalCredit) < 0.01;
        }, {
            message: "القيد غير متوازن (المدين لا يساوي الدائن)",
            path: ["root"], // This currently doesn't show nicely in react-hook-form on custom paths usually, but we'll handle display manually
        })
});

type JournalFormValues = z.infer<typeof journalEntrySchema>;

interface AccountOption {
    id: number;
    code: string;
    name: string;
}

export function JournalEntryForm({ accounts }: { accounts: AccountOption[] }) {
    const { dict: rawDict } = useTranslation();
    const dict = rawDict as any;
    const [totals, setTotals] = useState({ debit: 0, credit: 0, diff: 0 });

    const { control, register, handleSubmit, watch, formState: { errors } } = useForm<JournalFormValues>({
        resolver: zodResolver(journalEntrySchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            lines: [
                { accountId: "", debit: 0, credit: 0, description: "" },
                { accountId: "", debit: 0, credit: 0, description: "" }
            ]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "lines"
    });

    const watchedLines = watch("lines");

    useEffect(() => {
        const debit = watchedLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
        const credit = watchedLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
        setTotals({ debit, credit, diff: debit - credit });
    }, [watchedLines]);

    const router = useRouter(); // Import assumed present
    const onSubmit = async (data: JournalFormValues) => {
        try {
            const { createJournalEntry } = await import("../actions");
            const response = await createJournalEntry({
                date: data.date,
                description: data.description,
                lines: data.lines.map(l => ({
                    accountId: parseInt(l.accountId),
                    description: l.description,
                    debit: l.debit,
                    credit: l.credit
                }))
            });

            if (response.success) {
                toast.success(dict.Journal.Success);
                router.push("/dashboard/journal");
            } else {
                toast.error(dict.Journal.Error);
            }
        } catch (e) {
            toast.error(dict.Journal.Error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="text-sm font-medium mb-1 block">{dict.Journal.Form.Date}</label>
                    <Input type="date" {...register("date")} />
                    {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
                </div>
                <div className="md:col-span-2">
                    <label className="text-sm font-medium mb-1 block">{dict.Journal.Form.Description}</label>
                    <Input placeholder={dict.Journal.Form.Errors.DescOptional} {...register("description")} />
                </div>
            </div>

            {/* Lines Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[30%]">{dict.Journal.Table.Account}</TableHead>
                                <TableHead className="w-[30%]">{dict.Journal.Table.Description}</TableHead>
                                <TableHead className="w-[15%]">{dict.Journal.Table.Debit}</TableHead>
                                <TableHead className="w-[15%]">{dict.Journal.Table.Credit}</TableHead>
                                <TableHead className="w-[5%]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => (
                                <TableRow key={field.id}>
                                    <TableCell className="p-2">
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            {...register(`lines.${index}.accountId` as const)}
                                        >
                                            <option value="">{dict.Journal.Form.SelectAccount}</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.code} - {acc.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.lines?.[index]?.accountId && <p className="text-red-500 text-xs">{errors.lines[index]?.accountId?.message}</p>}
                                    </TableCell>
                                    <TableCell className="p-2">
                                        <Input {...register(`lines.${index}.description` as const)} placeholder={dict.Journal.Form.Description} />
                                    </TableCell>
                                    <TableCell className="p-2">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            {...register(`lines.${index}.debit` as const, { valueAsNumber: true })}
                                            disabled={watchedLines[index]?.credit > 0}
                                            className={watchedLines[index]?.credit > 0 ? "bg-gray-100" : ""}
                                        />
                                    </TableCell>
                                    <TableCell className="p-2">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            {...register(`lines.${index}.credit` as const, { valueAsNumber: true })}
                                            disabled={watchedLines[index]?.debit > 0}
                                            className={watchedLines[index]?.debit > 0 ? "bg-gray-100" : ""}
                                        />
                                    </TableCell>
                                    <TableCell className="p-2 text-center">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                            <Trash2 size={16} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Footer Actions & Totals */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 p-4 rounded-lg border">
                <div>
                    <Button type="button" variant="outline" onClick={() => append({ accountId: "", debit: 0, credit: 0, description: "" })} className="gap-2">
                        <Plus size={16} />
                        <span>{dict.Journal.Form.AddLine}</span>
                    </Button>
                </div>

                <div className="flex gap-8 text-sm font-medium">
                    <div className="flex flex-col items-center">
                        <span className="text-muted-foreground mb-1">{dict.Journal.Table.TotalDebit}</span>
                        <span className="text-lg text-blue-600">{totals.debit.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-muted-foreground mb-1">{dict.Journal.Table.TotalCredit}</span>
                        <span className="text-lg text-red-600">{totals.credit.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-muted-foreground mb-1">{dict.Journal.Table.Difference}</span>
                        <span className={cn("text-lg", Math.abs(totals.diff) > 0.001 ? "text-red-600 font-bold" : "text-green-600")}>
                            {totals.diff.toFixed(2)}
                        </span>
                    </div>
                </div>

                <div>
                    <Button type="submit" size="lg" className="gap-2 min-w-[150px]" disabled={Math.abs(totals.diff) > 0.001}>
                        <Save size={18} />
                        <span>{dict.Journal.Form.Save}</span>
                    </Button>
                </div>
            </div>

            {errors.root && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-center border border-red-200">
                    {errors.root.message}
                </div>
            )}
        </form>
    );
}
