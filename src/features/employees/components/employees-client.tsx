"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Wallet, CreditCard, ClipboardList } from "lucide-react";
import { EmployeeList } from "./employee-list";
import { PayrollForm } from "./payroll-form";
import { AdvanceForm } from "./advance-form";
import { EmployeeReports } from "./employee-reports";
import { AttendanceView } from "./attendance-view";

export function EmployeesClient({ initialEmployees, dict, session }: { initialEmployees: any[], dict: any, session: any }) {
    const [employees, setEmployees] = useState(initialEmployees);

    const isAdmin = session?.role?.toUpperCase() === 'ADMIN' || session?.role?.toUpperCase() === 'SUPER_ADMIN';

    return (
        <Tabs defaultValue="list" className="w-full" dir="rtl">
            <TabsList className={`grid ${isAdmin ? 'grid-cols-5' : 'grid-cols-3'} w-full max-w-3xl h-auto p-1 bg-slate-100/50`}>
                <TabsTrigger value="list" className="gap-2 py-2">
                    <Users size={16} />
                    <span>{dict.Employees.Tabs.List}</span>
                </TabsTrigger>

                {isAdmin && (
                    <TabsTrigger value="payroll" className="gap-2 py-2">
                        <Wallet size={16} />
                        <span>{dict.Employees.Tabs.Payroll}</span>
                    </TabsTrigger>
                )}

                <TabsTrigger value="advances" className="gap-2 py-2">
                    <CreditCard size={16} />
                    <span>{dict.Employees.Tabs.Advances}</span>
                </TabsTrigger>

                <TabsTrigger value="attendance" className="gap-2 py-2">
                    <ClipboardList size={16} />
                    <span>{dict.Employees.Tabs.Attendance}</span>
                </TabsTrigger>

                {isAdmin && (
                    <TabsTrigger value="reports" className="gap-2 py-2">
                        <ClipboardList size={16} />
                        <span>{dict.Employees.Tabs.Reports}</span>
                    </TabsTrigger>
                )}
            </TabsList>

            <TabsContent value="list" className="mt-6">
                <EmployeeList initialEmployees={employees} dict={dict} />
            </TabsContent>

            <TabsContent value="payroll" className="mt-6">
                <PayrollForm employees={employees} dict={dict} />
            </TabsContent>

            <TabsContent value="advances" className="mt-6">
                <AdvanceForm employees={employees} dict={dict} />
            </TabsContent>

            <TabsContent value="attendance" className="mt-6">
                <AttendanceView employees={employees} dict={dict} />
            </TabsContent>

            <TabsContent value="reports" className="mt-6">
                <EmployeeReports employees={employees} dict={dict} />
            </TabsContent>
        </Tabs>
    );
}
