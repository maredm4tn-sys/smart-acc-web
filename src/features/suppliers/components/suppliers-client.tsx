"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, CloudOff } from "lucide-react";
import { SupplierActions } from "@/features/suppliers/components/supplier-actions";
import { mirrorData, getLocalData, STORES } from "@/lib/offline-db";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-center">{dict.Suppliers.Table.Name}</TableHead>
                                    <TableHead className="text-center">{dict.Suppliers.Table.Company}</TableHead>
                                    <TableHead className="text-center">{dict.Suppliers.Table.Address}</TableHead>
                                    <TableHead className="text-center">{dict.Suppliers.Table.Phone}</TableHead>
                                    <TableHead className="text-center">{dict.Suppliers.Table.TaxId}</TableHead>
                                    <TableHead className="text-center w-[100px]">{dict.Suppliers.Table.Actions}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {suppliers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                                            {dict.Suppliers.Table.NoSuppliers}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    suppliers.map((s) => (
                                        <TableRow key={s.id}>
                                            <TableCell className="text-center font-medium">{s.name}</TableCell>
                                            <TableCell className="text-center">{s.companyName || "-"}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="truncate max-w-[200px] mx-auto" title={s.address || ""}>{s.address || "-"}</div>
                                            </TableCell>
                                            <TableCell className="text-center font-mono text-xs">{s.phone || "-"}</TableCell>
                                            <TableCell className="text-center font-mono text-xs">{s.taxId || "-"}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center">
                                                    <SupplierActions supplier={s} dict={dict} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
