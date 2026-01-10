import { Button } from "@/components/ui/button";
import { AddProductDialog } from "@/features/inventory/components/add-product-dialog";
import { EditProductDialog } from "@/features/inventory/components/edit-product-dialog";
import { BulkUploadDialog } from "@/features/inventory/components/bulk-upload-dialog";
import { db } from "@/db";
import { products } from "@/db/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getDictionary } from "@/lib/i18n-server";
import { getSession } from "@/features/auth/actions";
import { getActiveTenantId } from "@/lib/actions-utils";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

import { ExcelExportButton } from "@/components/common/excel-export-button";
import { getInventoryExport } from "@/features/inventory/actions";
import { getProducts } from "@/features/inventory/queries";

// ... existing imports

import { InventoryClient } from "@/features/inventory/components/inventory-client";

export default async function InventoryPage() {
    const dict = await getDictionary();
    const productsList = await getProducts();
    const session = await getSession();
    const isAdmin = session?.role === 'admin' || session?.role === 'SUPER_ADMIN';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">{dict.Inventory.Title}</h1>
                    <p className="text-sm text-muted-foreground">{dict.Inventory.Description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {isAdmin && (
                        <ExcelExportButton
                            getData={getInventoryExport}
                            fileName="Inventory_Report"
                            label={dict.Inventory.ExportExcel}
                        />
                    )}
                    <BulkUploadDialog />
                    <AddProductDialog triggerLabel={dict.Inventory.NewItem} />
                </div>
            </div>

            <InventoryClient initialProducts={productsList} dict={dict} />
        </div>
    );
}
