"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
    return (
        <Button onClick={() => window.print()} className="gap-2">
            <Printer size={16} />
            طباعة / PDF
        </Button>
    )
}
