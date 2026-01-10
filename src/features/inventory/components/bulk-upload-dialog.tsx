"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { bulkImportProducts } from "../actions";
import { useTranslation } from "@/components/providers/i18n-provider"; // Added hook

export function BulkUploadDialog() {
    const { dict } = useTranslation(); // Use hook
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

            // Map Data
            const productsToImport = jsonData.map((row: any) => {
                // Try Arabic headers first, transform to clean numbers
                const name = row['اسم الصنف'] || row['Name'] || row['name'];
                const buyPrice = parseFloat(row['سعر الشراء'] || row['Buying Price'] || row['buyPrice'] || 0);
                const sellPrice = parseFloat(row['سعر البيع'] || row['Selling Price'] || row['sellPrice'] || 0);
                const stock = parseFloat(row['الرصيد'] || row['Stock'] || row['stock'] || 0);

                // Allow SKU if provided, otherwise undefined (backend handles it)
                const sku = row['SKU'] || row['sku']; // Optional

                if (!name) return null; // Skip invalid rows without name

                return {
                    name: String(name),
                    sku: sku ? String(sku) : undefined,
                    buyPrice: isNaN(buyPrice) ? 0 : buyPrice,
                    sellPrice: isNaN(sellPrice) ? 0 : sellPrice,
                    stockQuantity: isNaN(stock) ? 0 : stock,
                };
            }).filter(Boolean); // Remove nulls

            if (productsToImport.length === 0) {
                toast.error(dict.Inventory.ImportDialog.NoValidRows);
                setIsLoading(false);
                return;
            }

            const result = await bulkImportProducts(productsToImport as any);

            if (result.success) {
                toast.success(result.message);
                if (result.details) toast.info(result.details);
                setOpen(false);
            } else {
                toast.error(result.message);
            }

        } catch (error) {
            console.error("Upload Error:", error);
            toast.error(dict.Inventory.ImportDialog.ProcessingError);
        } finally {
            setIsLoading(false);
            // Reset input
            e.target.value = '';
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <FileSpreadsheet size={16} />
                    <span>{dict.Inventory.ImportExcel}</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{dict.Inventory.ImportDialog.Title}</DialogTitle>
                    <DialogDescription>
                        {dict.Inventory.ImportDialog.Description}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid w-full max-w-sm items-center gap-1.5 py-4">
                    <Label htmlFor="excel-upload">{dict.Inventory.ImportDialog.FileLabel}</Label>
                    <div className="flex gap-2">
                        <Input
                            id="excel-upload"
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileUpload}
                            disabled={isLoading}
                        />
                    </div>
                    {isLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                            <Loader2 className="animate-spin h-4 w-4" />
                            <span>{dict.Inventory.ImportDialog.Processing}</span>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
