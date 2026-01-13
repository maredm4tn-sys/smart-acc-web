"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Save } from "lucide-react";
import { toast } from "sonner";
import { createAdvance } from "@/features/employees/actions";

export function AdvanceForm({ employees, dict }: { employees: any[], dict: any }) {
    const [type, setType] = useState<"advance" | "repayment">("advance");
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [amount, setAmount] = useState("");
    const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7));
    const [treasury, setTreasury] = useState("");
    const [notes, setNotes] = useState("");
    const [treasuries, setTreasuries] = useState<any[]>([]);

    useEffect(() => {
        const fetchTreasuries = async () => {
            const { getTreasuryAccounts } = await import("@/features/accounting/actions");
            const data = await getTreasuryAccounts();
            setTreasuries(data);
            if (data.length > 0) setTreasury(data[0].id.toString());
        };
        fetchTreasuries();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee || !amount) {
            toast.error(dict.Common?.Error || "Please complete all fields");
            return;
        }

        const res = await createAdvance({
            employeeId: parseInt(selectedEmployee),
            date: new Date().toISOString().split('T')[0],
            salaryMonth,
            amount,
            type,
            treasuryAccountId: parseInt(treasury),
            notes
        });

        if (res.success) {
            toast.success(dict.Advances.Success);
            // reset form or reload
        } else {
            toast.error(res.message);
        }
    };

    return (
        <Card className="border-none shadow-md max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    {dict.Advances.Title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex gap-4 p-1 bg-slate-100 rounded-lg">
                        <Button
                            type="button"
                            variant={type === 'advance' ? 'default' : 'ghost'}
                            className="flex-1"
                            onClick={() => setType('advance')}
                        >
                            {dict.Advances.Types.Advance}
                        </Button>
                        <Button
                            type="button"
                            variant={type === 'repayment' ? 'default' : 'ghost'}
                            className="flex-1"
                            onClick={() => setType('repayment')}
                        >
                            {dict.Advances.Types.Repayment}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>{dict.Employees.Table.Name}</Label>
                            <Select onValueChange={setSelectedEmployee}>
                                <SelectTrigger>
                                    <SelectValue placeholder={dict.Payroll.SelectEmployee} />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Advances.Amount}</Label>
                            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="font-mono font-bold" />
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Advances.Month}</Label>
                            <Input type="month" value={salaryMonth} onChange={(e) => setSalaryMonth(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Payroll.Treasury}</Label>
                            <Select onValueChange={setTreasury} value={treasury}>
                                <SelectTrigger>
                                    <SelectValue placeholder={dict.Payroll.SelectTreasury} />
                                </SelectTrigger>
                                <SelectContent>
                                    {treasuries.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{dict.Payroll.Notes}</Label>
                        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={dict.Payroll.NotesPlaceholder} />
                    </div>

                    <Button type="submit" className="w-full h-12 text-lg gap-2" variant={type === 'advance' ? 'default' : 'secondary'}>
                        <Save size={18} />
                        {dict.Common?.Confirm || "Confirm"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
