"use client";

import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface ExcelExportButtonProps {
    getData: () => Promise<any[]>;
    fileName?: string;
    sheetName?: string;
    label?: string;
    className?: string; // allow overrides
}

export function ExcelExportButton({
    getData,
    fileName = "Export",
    sheetName = "Sheet1",
    label = "Export (Excel)",
    className
}: ExcelExportButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleExport = async () => {
        try {
            setIsLoading(true);
            toast.info("جاري تحضير الملف...", { id: "export-loading" });

            const data = await getData();

            if (!data || data.length === 0) {
                toast.dismiss("export-loading");
                toast.warning("لا توجد بيانات للتصدير");
                return;
            }

            // Create Workbook
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

            // Auto-width columns (simple heuristic)
            const firstRow = data[0];
            if (firstRow) {
                const cols = Object.keys(firstRow).map(key => ({ wch: Math.max(20, key.length + 5) }));
                worksheet["!cols"] = cols;
            }

            // Download
            XLSX.writeFile(workbook, `${fileName}.xlsx`);
            toast.dismiss("export-loading");
            toast.success("تم تصدير الملف بنجاح");

        } catch (error) {
            console.error("Export Error:", error);
            toast.dismiss("export-loading");
            toast.error("حدث خطأ أثناء التصدير");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            className={`gap-2 ${className}`}
            onClick={handleExport}
            disabled={isLoading}
        >
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            {isLoading ? "جاري التحميل..." : label}
        </Button>
    );
}
