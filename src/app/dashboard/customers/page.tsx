import { AddCustomerDialog } from "@/features/customers/components/add-customer-dialog";
import { CustomerImport } from "@/features/customers/components/customer-import";
import { getCustomers, getCustomersExport } from "@/features/customers/actions";
import { getSession } from "@/features/auth/actions";
import { ExcelExportButton } from "@/components/common/excel-export-button";
import { getDictionary } from "@/lib/i18n-server";
import { CustomersClient } from "@/features/customers/components/customers-client";

import { getAllRepresentatives } from "@/features/representatives/actions"; // Added

export default async function CustomersPage() {
    const rawDict = await getDictionary();
    const dict = rawDict as any;
    const customers = await getCustomers();
    const representatives = await getAllRepresentatives(); // Added
    const session = await getSession();
    const isAdmin = session?.role === 'admin' || session?.role === 'SUPER_ADMIN';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">{dict.Customers.Title}</h2>
                    <p className="text-sm md:text-base text-muted-foreground">{dict.Customers.Description}</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                    <AddCustomerDialog triggerLabel={dict.Customers.NewCustomer} representatives={representatives} />
                    {isAdmin && <CustomerImport />}
                    {isAdmin && (
                        <ExcelExportButton
                            getData={getCustomersExport}
                            fileName="Customers_List"
                            label={dict.Customers.ExportExcel}
                        />
                    )}
                </div>
            </div>

            <CustomersClient initialCustomers={customers} dict={dict} session={session} representatives={representatives} />
        </div>
    );
}
