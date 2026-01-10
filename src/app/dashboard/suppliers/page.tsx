import { getDictionary } from "@/lib/i18n-server";
import { AddSupplierDialog } from "@/features/suppliers/components/add-supplier-dialog";
import { SupplierActions } from "@/features/suppliers/components/supplier-actions";
import { getSuppliers } from "@/features/suppliers/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Truck } from "lucide-react";

import { SuppliersClient } from "@/features/suppliers/components/suppliers-client";

export default async function SuppliersPage() {
    const dict = await getDictionary();
    const suppliers = await getSuppliers();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">{dict.Suppliers.Title}</h2>
                    <p className="text-sm md:text-base text-muted-foreground">{dict.Suppliers.Description}</p>
                </div>
                <div className="w-full sm:w-auto">
                    <AddSupplierDialog />
                </div>
            </div>

            <SuppliersClient initialSuppliers={suppliers} dict={dict} />
        </div>
    );
}
