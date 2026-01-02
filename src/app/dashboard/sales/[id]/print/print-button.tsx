"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";

export function PrintButton() {
    const { dict } = useTranslation();
    return (
        <Button onClick={() => window.print()} className="gap-2">
            <Printer size={16} />
            {dict.Sales.Table.Print} / PDF
        </Button>
    )
}
