"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, CloudOff } from "lucide-react";
import { CustomerActions } from "@/features/customers/components/customer-actions";
import { mirrorData, getLocalData, STORES } from "@/lib/offline-db";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export function CustomersClient({ initialCustomers, dict, session, representatives = [] }: { initialCustomers: any[], dict: any, session: any, representatives?: any[] }) {
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
                    <span>{dict.Common.Offline.NoConnection}</span>
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
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-center">{dict.Customers.Table.Name}</TableHead>
                                        <TableHead className="text-center">{dict.Customers.Table.Company}</TableHead>
                                        <TableHead className="text-center">{dict.Customers.Table.Address}</TableHead>
                                        <TableHead className="text-center">{dict.Customers.Table.Phone}</TableHead>
                                        <TableHead className="text-center">{dict.Customers.Table.Email}</TableHead>
                                        <TableHead className="text-center">{dict.Customers.Table.TotalDebt}</TableHead>
                                        <TableHead className="text-center w-[80px]">{dict.Customers.Table.Actions}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {customers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-24 text-gray-500">
                                                {dict.Customers.Table.NoCustomers}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        customers.map((c) => (
                                            <TableRow key={c.id}>
                                                <TableCell className="text-center">
                                                    <div className="truncate max-w-[150px] mx-auto font-medium" title={c.name}>{c.name}</div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="truncate max-w-[120px] mx-auto" title={c.companyName || ""}>{c.companyName || "-"}</div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="truncate max-w-[150px] mx-auto" title={c.address || ""}>{c.address || "-"}</div>
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-xs">
                                                    {c.phone || "-"}
                                                </TableCell>
                                                <TableCell className="text-center text-xs">
                                                    <div className="truncate max-w-[150px] mx-auto font-mono" title={c.email || ""}>{c.email || "-"}</div>
                                                </TableCell>
                                                <TableCell className={`text-center font-bold ${Number(c.totalDebt) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span>{Number(c.totalDebt || 0).toFixed(2)}</span>
                                                        {Number(c.creditLimit) > 0 && Number(c.totalDebt) > Number(c.creditLimit) && (
                                                            <Badge variant="destructive" className="text-[10px] px-1 py-0 flex items-center gap-1">
                                                                <AlertTriangle size={10} />
                                                                {dict.Customers.Table.LimitExceeded}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center">
                                                        <CustomerActions customer={c} currentRole={session?.role} dict={dict} />
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
                                    <CustomerActions customer={c} currentRole={session?.role} dict={dict} />
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                    {c.companyName && <div className="flex justify-between border-b border-dashed pb-1"><span>{dict.Customers.Table.Company}:</span> <span className="text-gray-900">{c.companyName}</span></div>}
                                    {c.phone && <div className="flex justify-between border-b border-dashed pb-1"><span>{dict.Customers.Table.Phone}:</span> <span className="font-mono">{c.phone}</span></div>}
                                    <div className="flex justify-between font-bold pt-1">
                                        <span>{dict.Customers.Table.TotalDebt}:</span>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={Number(c.totalDebt) > 0 ? 'text-red-600' : 'text-green-600'}>
                                                {Number(c.totalDebt || 0).toFixed(2)}
                                            </span>
                                            {Number(c.creditLimit) > 0 && Number(c.totalDebt) > Number(c.creditLimit) && (
                                                <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                                                    {dict.Customers.Table.LimitExceeded}
                                                </Badge>
                                            )}
                                        </div>
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
