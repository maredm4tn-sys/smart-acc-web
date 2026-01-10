"use client";

import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/components/providers/i18n-provider";

export function CustomerImport() {
    const { dict } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("/api/customers/import", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                toast.success(dict.Customers.Messages.FileUploaded);
            } else {
                toast.error(dict.Common.Error);
            }
        } catch (error) {
            toast.error(dict.Common.Error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <>
            <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
                title="Upload Excel"
            />
            <Button
                variant="outline"
                onClick={handleButtonClick}
                disabled={isUploading}
                className="flex items-center justify-center gap-2 h-10"
            >
                <FileSpreadsheet size={16} />
                {isUploading ? "Uploading..." : dict.Customers.ImportExcel}
            </Button>
        </>
    );
}
