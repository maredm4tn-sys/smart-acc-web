"use client";

import { useState, useTransition } from "react";
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
import { useTranslation } from "@/components/providers/i18n-provider";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { payRepresentativeCommission } from "../actions";

interface PayCommissionDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    data: {
        representativeId: number;
        amount: number;
        period: string;
        name: string;
    };
}

export function PayCommissionDialog({ open, setOpen, data }: PayCommissionDialogProps) {
    const { dict: rawDict } = useTranslation();
    const dict = rawDict as any; // Temporary cast for dynamic keys
    const [isPending, startTransition] = useTransition();
    const [notes, setNotes] = useState("");

    const handlePay = () => {
        startTransition(async () => {
            const result = await payRepresentativeCommission({
                representativeId: data.representativeId,
                amount: data.amount,
                date: new Date().toISOString(),
                period: data.period,
                notes: notes
            });

            if (result.success) {
                toast.success(result.message);
                setOpen(false);
            } else {
                toast.error(result.message);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{dict.Representatives?.Reports?.SettleTitle || "Settle Commission Payment"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right col-span-1">{dict.Representatives?.Dialog?.Name || "Name"}</Label>
                        <Input value={data.name} disabled className="col-span-3 bg-muted" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right col-span-1">{dict.Representatives?.Reports?.Period || "Period"}</Label>
                        <Input value={data.period} disabled className="col-span-3 bg-muted text-xs" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right col-span-1">{dict.Representatives?.Reports?.Amount || "Amount"}</Label>
                        <div className="col-span-3 font-bold text-xl text-green-600">
                            {Number(data.amount).toLocaleString()} EGP
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>{dict.Representatives?.Dialog?.Notes || "Notes"}</Label>
                        <Input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={dict.Representatives?.Reports?.PaymentNotes || "Payment notes..."}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                        {dict.Common?.Cancel || "Cancel"}
                    </Button>
                    <Button onClick={handlePay} disabled={isPending} className="bg-green-600 hover:bg-green-700">
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {dict.Representatives?.Reports?.ConfirmPay || "Confirm Payment"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
