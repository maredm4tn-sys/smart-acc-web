"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { seedDefaultAccounts } from "@/features/accounting/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { useTranslation } from "@/components/providers/i18n-provider"; // Ensure import

export function DefaultAccountsSeed({ tenantId, label }: { tenantId: string, label?: string }) {
    const [pending, startTransition] = useTransition();
    const router = useRouter();
    const { dict } = useTranslation();

    const handleSeed = () => {
        if (!confirm(dict.Confirm.Message)) return;
        // User said everything English.
        // Actually I didn't add a key for this in dict.
        // I'll stick to English hardcoded or add to dict.
        // Let's check if I have a generic confirmation. No.
        // Using strict English as requested.

        startTransition(async () => {
            const res = await seedDefaultAccounts(tenantId);
            if (res.success) {
                toast.success(res.message);
                router.refresh();
            } else {
                toast.error(res.message);
            }
        });
    };

    return (
        <Button variant="outline" className="gap-2" onClick={handleSeed} disabled={pending}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            <span>{label || dict.Accounts.ImportDefault}</span>
        </Button>
    )
}
