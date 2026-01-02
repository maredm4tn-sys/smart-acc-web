import { AddCustomerDialog } from "@/features/customers/components/add-customer-dialog";
import { getCustomers } from "@/features/customers/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";
import { getDictionary } from "@/lib/i18n-server";

export default async function CustomersPage() {
    const dict = await getDictionary();
    const customers = await getCustomers();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">{dict.Customers.Title}</h2>
                    <p className="text-muted-foreground">{dict.Customers.Description}</p>
                </div>
                <AddCustomerDialog triggerLabel={dict.Customers.NewCustomer} />
            </div>

            <div className="hidden md:block">
                <Card className="border-none shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            {dict.Customers.ListTitle}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{dict.Customers.Table.Name}</TableHead>
                                    <TableHead>{dict.Customers.Table.Phone}</TableHead>
                                    <TableHead>{dict.Customers.Table.Email}</TableHead>
                                    <TableHead>{dict.Customers.Table.TaxId}</TableHead>
                                    <TableHead className="text-right">{"Total Debt"}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                            {dict.Customers.Table.NoCustomers}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    customers.map((c) => (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-medium">{c.name}</TableCell>
                                            <TableCell>{c.phone || "-"}</TableCell>
                                            <TableCell>{c.email || "-"}</TableCell>
                                            <TableCell>{c.taxId || "-"}</TableCell>
                                            <TableCell className={`text-right font-bold ${c.totalDebt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                {c.totalDebt?.toFixed(2) || "0.00"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-4">
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
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                    {c.phone && <div className="flex justify-between border-b pb-1"><span>{dict.Customers.Table.Phone}:</span> <span>{c.phone}</span></div>}
                                    {c.email && <div className="flex justify-between border-b pb-1"><span>{dict.Customers.Table.Email}:</span> <span>{c.email}</span></div>}
                                    {c.taxId && <div className="flex justify-between border-b pb-1"><span>{dict.Customers.Table.TaxId}:</span> <span>{c.taxId}</span></div>}
                                    <div className="flex justify-between font-bold pt-1">
                                        <span>Total Debt:</span>
                                        <span className={c.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}>
                                            {c.totalDebt?.toFixed(2) || "0.00"}
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
