

import { getEmployees } from "@/features/employees/actions";
import { EmployeesClient } from "@/features/employees/components/employees-client";
import { getDictionary } from "@/lib/i18n-server";
import { getSession } from "@/features/auth/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Banknote, CalendarCheck, FileStack, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function EmployeesPage() {
    const rawDict = await getDictionary();
    const dict = rawDict as any;
    const employees = await getEmployees();
    const session = await getSession();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">{dict?.Employees?.Title || "Employees"}</h2>
                    <p className="text-sm md:text-base text-muted-foreground">{dict?.Employees?.Description || "Manage employee data"}</p>
                </div>
            </div>

            <EmployeesClient initialEmployees={employees} dict={dict} session={session} />
        </div>
    );
}
