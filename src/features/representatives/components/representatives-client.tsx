"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, BadgePercent } from "lucide-react";
import { RepresentativeActions } from "./representative-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function RepresentativesClient({ representatives = [], dict }: { representatives?: any[], dict: any }) {
    return (
        <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    {dict?.Representatives?.MenuLabel || "Representatives"}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-center">{dict?.Representatives?.Table?.Name || "Name"}</TableHead>
                                <TableHead className="text-center">{dict?.Representatives?.Table?.Type || "Type"}</TableHead>
                                <TableHead className="text-center">{dict?.Representatives?.Table?.Phone || "Phone"}</TableHead>
                                <TableHead className="text-center">{dict?.Representatives?.Table?.Address || "Address"}</TableHead>
                                <TableHead className="text-center">{dict?.Representatives?.Table?.CommissionRate || "Commission"}</TableHead>
                                <TableHead className="text-center">{dict?.Representatives?.Table?.Notes || "Notes"}</TableHead>
                                <TableHead className="text-center w-[100px]">{dict?.Representatives?.Table?.Actions || "Actions"}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!representatives || representatives.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-gray-500">
                                        {dict?.Representatives?.Table?.NoRepresentatives || "No representatives found"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                representatives.map((item) => (
                                    <TableRow key={item?.id}>
                                        <TableCell className="text-center font-medium">{item?.name || "-"}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={item?.type === 'sales' ? 'default' : 'secondary'}>
                                                {item?.type === 'sales'
                                                    ? (dict?.Representatives?.Types?.Sales || "Sales")
                                                    : (dict?.Representatives?.Types?.Delivery || "Delivery")
                                                }
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-xs" dir="ltr">{item?.phone || "-"}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="truncate max-w-[200px] mx-auto" title={item?.address || ""}>{item?.address || "-"}</div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {Number(item?.commissionRate || 0) > 0 ? (
                                                <div className="flex items-center justify-center gap-1 font-bold">
                                                    <BadgePercent size={14} className="text-muted-foreground" />
                                                    {item.commissionRate}%
                                                </div>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell className="text-center text-muted-foreground text-sm">
                                            <div className="truncate max-w-[150px] mx-auto">{item?.notes || "-"}</div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                <RepresentativeActions representative={item} dict={dict} />
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
    );
}

