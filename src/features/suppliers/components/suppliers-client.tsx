"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, CloudOff } from "lucide-react";
import { SupplierActions } from "@/features/suppliers/components/supplier-actions";
import { mirrorData, getLocalData, STORES } from "@/lib/offline-db";
import { toast } from "sonner";

export function SuppliersClient({ initialSuppliers, dict }: { initialSuppliers: any[], dict: any }) {
    const [suppliers, setSuppliers] = useState(initialSuppliers);
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        if (navigator.onLine && initialSuppliers.length > 0) {
            mirrorData(STORES.SUPPLIERS, initialSuppliers);
        }

        const handleOffline = async () => {
            setIsOffline(true);
            const local = await getLocalData(STORES.SUPPLIERS);
            if (local.length > 0) setSuppliers(local);
        };

        const handleOnline = () => {
            setIsOffline(false);
            window.location.reload();
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        if (!navigator.onLine) handleOffline();

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [initialSuppliers]);

    return (
        <div className="space-y-4">
            {isOffline && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center gap-2 text-amber-700 text-sm">
                    <CloudOff size={18} />
                    <span>{(dict as any).Common?.Offline?.NoConnection || "تعمل الآن في وضع عدم الاتصال (بيانات الموردين مخزنة محلياً)"}</span>
                </div>
            )}

            <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Truck className="h-5 w-5 text-primary" />
                        {dict.Suppliers.ListTitle}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    <div className="rt-table-container">
                        <table className="rt-table">
                            <thead>
                                <tr>
                                    <th className="text-center">{dict.Suppliers.Table.Name}</th>
                                    <th className="text-center">{dict.Suppliers.Table.Company}</th>
                                    <th className="text-center">{dict.Suppliers.Table.Address}</th>
                                    <th className="text-center">{dict.Suppliers.Table.Phone}</th>
                                    <th className="text-center">{dict.Suppliers.Table.TaxId}</th>
                                    <th className="text-center w-[100px]">{dict.Suppliers.Table.Actions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-gray-500">
                                            {dict.Suppliers.Table.NoSuppliers}
                                        </td>
                                    </tr>
                                ) : (
                                    suppliers.map((s) => (
                                        <tr key={s.id}>
                                            <td data-label={dict.Suppliers.Table.Name} className="text-center font-medium">{s.name}</td>
                                            <td data-label={dict.Suppliers.Table.Company} className="text-center">{s.companyName || "-"}</td>
                                            <td data-label={dict.Suppliers.Table.Address} className="text-center">{s.address || "-"}</td>
                                            <td data-label={dict.Suppliers.Table.Phone} className="text-center font-mono text-xs">{s.phone || "-"}</td>
                                            <td data-label={dict.Suppliers.Table.TaxId} className="text-center font-mono text-xs">{s.taxId || "-"}</td>
                                            <td data-label={dict.Suppliers.Table.Actions} className="text-center">
                                                <div className="flex justify-center">
                                                    <SupplierActions supplier={s} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
