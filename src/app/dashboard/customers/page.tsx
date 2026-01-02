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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
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
