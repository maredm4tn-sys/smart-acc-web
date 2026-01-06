import { AddSupplierDialog } from "@/features/suppliers/components/add-supplier-dialog";
import { SupplierActions } from "@/features/suppliers/components/supplier-actions";
import { getSuppliers } from "@/features/suppliers/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Truck } from "lucide-react";

export default async function SuppliersPage() {
    const suppliers = await getSuppliers();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">الموردين</h2>
                    <p className="text-muted-foreground">إدارة قائمة الموردين والشركات</p>
                </div>
                <div className="flex flex-row-reverse justify-start gap-3">
                    <AddSupplierDialog />
                </div>
            </div>

            <Card className="border-none shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-primary" />
                        قائمة الموردين
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table className="table-fixed w-full">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-center">الاسم</TableHead>
                                <TableHead className="text-center">الشركة</TableHead>
                                <TableHead className="text-center">العنوان</TableHead>
                                <TableHead className="text-center">الهاتف</TableHead>
                                <TableHead className="text-center">الرقم الضريبي</TableHead>
                                <TableHead className="text-center w-[100px]">إجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {suppliers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                        لا يوجد موردين حالياً
                                    </TableCell>
                                </TableRow>
                            ) : (
                                suppliers.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="text-center font-medium">{s.name}</TableCell>
                                        <TableCell className="text-center">{s.companyName || "-"}</TableCell>
                                        <TableCell className="text-center">{s.address || "-"}</TableCell>
                                        <TableCell className="text-center font-mono text-xs">{s.phone || "-"}</TableCell>
                                        <TableCell className="text-center font-mono text-xs">{s.taxId || "-"}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                <SupplierActions supplier={s} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
