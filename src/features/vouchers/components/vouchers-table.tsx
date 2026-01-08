"use client";

import { useTranslation } from "@/components/providers/i18n-provider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function VouchersTable({ vouchers }: { vouchers: any[] }) {
    const { dict: rawDict } = useTranslation();
    const dict = rawDict as any; // safe cast

    return (
        <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden md:block rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{dict.Vouchers.Table.Number}</TableHead>
                            <TableHead>{dict.Vouchers.Table.Date}</TableHead>
                            <TableHead>{dict.Vouchers.Table.Type}</TableHead>
                            <TableHead>{dict.Vouchers.Table.Party}</TableHead>
                            <TableHead>{dict.Vouchers.Table.Amount}</TableHead>
                            <TableHead>{dict.Vouchers.Table.Status}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {vouchers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    {dict.Vouchers.Table.NoVouchers}
                                </TableCell>
                            </TableRow>
                        ) : (
                            vouchers.map((v) => (
                                <TableRow key={v.id}>
                                    <TableCell className="font-medium">{v.voucherNumber}</TableCell>
                                    <TableCell>{v.date}</TableCell>
                                    <TableCell>
                                        <Badge variant={v.type === 'receipt' ? 'default' : 'secondary'}>
                                            {v.type === 'receipt' ? dict.Vouchers.Receipt : dict.Vouchers.Payment}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {v.partyType === 'customer' && dict.Vouchers.Form.Types.Customer}
                                        {v.partyType === 'supplier' && dict.Vouchers.Form.Types.Supplier}
                                        {v.partyType === 'other' && dict.Vouchers.Form.Types.Other}
                                        {v.partyId ? ` #${v.partyId}` : ''}
                                    </TableCell>
                                    <TableCell>{Number(v.amount).toLocaleString()} EGP</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {v.status === 'posted' ? 'مُرحّل' : v.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {vouchers.map((v) => (
                    <div key={v.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-gray-900">{v.voucherNumber}</h3>
                                <p className="text-xs text-gray-500">{v.date}</p>
                            </div>
                            <Badge variant={v.type === 'receipt' ? 'default' : 'secondary'}>
                                {v.type === 'receipt' ? dict.Vouchers.Receipt : dict.Vouchers.Payment}
                            </Badge>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <div className="text-sm font-bold text-slate-800">
                                {Number(v.amount).toLocaleString()} EGP
                            </div>
                            <div className="text-xs text-slate-500">
                                {v.partyType === 'customer' && dict.Vouchers.Form.Types.Customer}
                                {v.partyType === 'supplier' && dict.Vouchers.Form.Types.Supplier}
                                {v.partyType === 'other' && dict.Vouchers.Form.Types.Other}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
