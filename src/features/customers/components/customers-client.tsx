"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CloudOff } from "lucide-react";
import { CustomerActions } from "@/features/customers/components/customer-actions";
import { mirrorData, getLocalData, STORES } from "@/lib/offline-db";
import { toast } from "sonner";

export function CustomersClient({ initialCustomers, dict, session }: { initialCustomers: any[], dict: any, session: any }) {
    const [customers, setCustomers] = useState(initialCustomers);
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        if (navigator.onLine && initialCustomers.length > 0) {
            mirrorData(STORES.CUSTOMERS, initialCustomers);
        }

        const handleOffline = async () => {
            setIsOffline(true);
            const local = await getLocalData(STORES.CUSTOMERS);
            if (local.length > 0) setCustomers(local);
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
    }, [initialCustomers]);

    return (
        <div className="space-y-4">
            {isOffline && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center gap-2 text-amber-700 text-sm">
                    <CloudOff size={18} />
                    <span>{dict.Common?.Offline?.NoConnection || "تعمل الآن في وضع عدم الاتصال (بيانات العملاء مخزنة محلياً)"}</span>
                </div>
            )}

            <div className="hidden lg:block">
                <Card className="border-none shadow-md overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            {dict.Customers.ListTitle}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-6">
                        <div className="rt-table-container">
                            <table className="rt-table">
                                <thead>
                                    <tr>
                                        <th className="text-center">{dict.Customers.Table.Name}</th>
                                        <th className="text-center">{dict.Customers.Table.Company}</th>
                                        <th className="text-center">{dict.Customers.Table.Address}</th>
                                        <th className="text-center">{dict.Customers.Table.Phone}</th>
                                        <th className="text-center">{dict.Customers.Table.Email}</th>
                                        <th className="text-center">{dict.Customers.Table.TotalDebt}</th>
                                        <th className="text-center w-[80px]">{dict.Customers.Table.Actions}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-8 text-gray-500">
                                                {dict.Customers.Table.NoCustomers}
                                            </td>
                                        </tr>
                                    ) : (
                                        customers.map((c) => (
                                            <tr key={c.id}>
                                                <td data-label={dict.Customers.Table.Name} className="text-center">
                                                    <div className="truncate max-w-[150px] mx-auto" title={c.name}>{c.name}</div>
                                                </td>
                                                <td data-label={dict.Customers.Table.Company} className="text-center">
                                                    <div className="truncate max-w-[120px] mx-auto" title={c.companyName || ""}>{c.companyName || "-"}</div>
                                                </td>
                                                <td data-label={dict.Customers.Table.Address} className="text-center">
                                                    <div className="truncate max-w-[150px] mx-auto" title={c.address || ""}>{c.address || "-"}</div>
                                                </td>
                                                <td data-label={dict.Customers.Table.Phone} className="text-center font-mono text-xs">
                                                    {c.phone || "-"}
                                                </td>
                                                <td data-label={dict.Customers.Table.Email} className="text-center text-xs">
                                                    <div className="truncate max-w-[150px] mx-auto" title={c.email || ""}>{c.email || "-"}</div>
                                                </td>
                                                <td data-label={dict.Customers.Table.TotalDebt} className={`text-center font-bold ${c.totalDebt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {Number(c.totalDebt || 0).toFixed(2)}
                                                </td>
                                                <td data-label={dict.Customers.Table.Actions} className="text-center">
                                                    <div className="flex justify-center">
                                                        <CustomerActions customer={c} currentRole={session?.role} />
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

            {/* Mobile Card List */}
            <div className="lg:hidden space-y-4 pb-20">
                {customers.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">{dict.Customers.Table.NoCustomers}</div>
                ) : (
                    customers.map((c) => (
                        <Card key={c.id} className="border shadow-sm">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="font-bold text-lg flex items-center gap-2">
                                        <Users className="h-4 w-4 text-primary" />
                                        {c.name}
                                    </div>
                                    <CustomerActions customer={c} currentRole={session?.role} />
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                    {c.companyName && <div className="flex justify-between border-b border-dashed pb-1"><span>{dict.Customers.Table.Company}:</span> <span className="text-gray-900">{c.companyName}</span></div>}
                                    {c.phone && <div className="flex justify-between border-b border-dashed pb-1"><span>{dict.Customers.Table.Phone}:</span> <span className="font-mono">{c.phone}</span></div>}
                                    <div className="flex justify-between font-bold pt-1">
                                        <span>{dict.Customers.Table.TotalDebt}:</span>
                                        <span className={c.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}>
                                            {Number(c.totalDebt || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
