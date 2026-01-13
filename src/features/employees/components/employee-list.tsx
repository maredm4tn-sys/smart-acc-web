"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, UserPlus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { upsertEmployee, deleteEmployee } from "@/features/employees/actions";
import { toast } from "sonner";
import { useTransition } from "react";

export function EmployeeList({ initialEmployees, dict }: { initialEmployees: any[], dict: any }) {
    const [employees, setEmployees] = useState(initialEmployees);
    const [open, setOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<any>(null);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            id: editingEmployee?.id,
            code: formData.get("code") as string,
            name: formData.get("name") as string,
            address: formData.get("address") as string,
            phone: formData.get("phone") as string,
            email: formData.get("email") as string,
            basicSalary: formData.get("basicSalary") as string,
            notes: formData.get("notes") as string,
        };

        const res = await upsertEmployee(data);
        if (res.success) {
            toast.success(dict.Employees?.Form?.Success || "Success");
            setOpen(false);
            setEditingEmployee(null);
            // Refresh list (normally done via revalidatePath but for local state:)
            window.location.reload();
        } else {
            toast.error(res.message);
        }
    };

    const handleDelete = (id: number) => {
        if (confirm(dict.Employees.DeleteConfirm)) {
            startTransition(async () => {
                const res = await deleteEmployee(id);
                if (res.success) {
                    toast.success(dict.Employees.DeleteSuccess);
                    window.location.reload(); // Keep reload for now as per original logic
                }
                else toast.error(dict.Employees.DeleteError);
            });
        }
    };

    const handleEdit = (emp: any) => {
        setEditingEmployee(emp);
        setOpen(true);
    };

    return (
        <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    {dict.Employees?.Tabs?.List || "قائمة الموظفين"}
                </CardTitle>
                <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setEditingEmployee(null); }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus size={16} />
                            {dict.Employees?.NewEmployee || "إضافة موظف جديد"}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]" dir="rtl">
                        <DialogHeader>
                            <DialogTitle>{dict.Employees.Form.Title}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4"> {/* Changed action to onSubmit */}
                            {editingEmployee?.id && <input type="hidden" name="id" value={editingEmployee.id} />}
                            <Tabs defaultValue="personal" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="personal">{dict.Employees.Form.PersonalData}</TabsTrigger>
                                    <TabsTrigger value="salary">{dict.Employees.Form.SalaryData}</TabsTrigger>
                                </TabsList>
                                <TabsContent value="personal" className="space-y-4 pt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">{dict.Employees.Form.Name}</Label>
                                            <Input id="name" name="name" defaultValue={editingEmployee?.name} placeholder={dict.Employees.Form.Placeholders.Name} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="code">{dict.Employees.Form.Code}</Label>
                                            <Input id="code" name="code" defaultValue={editingEmployee?.code} placeholder={dict.Employees.Form.Placeholders.Code} required />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">{dict.Employees.Form.Phone}</Label>
                                            <Input id="phone" name="phone" defaultValue={editingEmployee?.phone || ""} placeholder={dict.Employees.Form.Placeholders.Phone} dir="ltr" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="address">{dict.Employees.Form.Address}</Label>
                                            <Input id="address" name="address" defaultValue={editingEmployee?.address || ""} placeholder={dict.Employees.Form.Placeholders.Address} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">{dict.Employees.Form.Email}</Label>
                                        <Input id="email" name="email" type="email" defaultValue={editingEmployee?.email || ""} placeholder={dict.Employees.Form.Placeholders.Email} dir="ltr" />
                                    </div>
                                </TabsContent>
                                <TabsContent value="salary" className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="basicSalary">{dict.Employees.Form.BasicSalary}</Label>
                                        <Input id="basicSalary" name="basicSalary" type="number" step="0.01" defaultValue={editingEmployee?.basicSalary || 0} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="notes">{dict.Employees.Form.Notes}</Label>
                                        <Textarea id="notes" name="notes" defaultValue={editingEmployee?.notes || ""} placeholder={dict.Employees.Form.Placeholders.Notes} />
                                    </div>
                                </TabsContent>
                            </Tabs>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}> {/* Changed onOpenChange to setOpen */}
                                    {dict.Employees.Form.Cancel}
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {dict.Employees.Form.Save}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="text-center">{dict.Employees?.Table?.Code || "الكود"}</TableHead>
                                <TableHead className="text-center">{dict.Employees?.Table?.Name || "الاسم"}</TableHead>
                                <TableHead className="text-center">{dict.Customers?.Table?.Phone || "الموبايل"}</TableHead>
                                <TableHead className="text-center">{dict.Employees?.Table?.Salary || "الراتب الأساسي"}</TableHead>
                                <TableHead className="text-center">{dict.Customers?.Table?.Address || "العنوان"}</TableHead>
                                <TableHead className="text-center w-[120px]">{dict.Customers?.Table?.Actions || "العمليات"}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-gray-500">{dict.Employees.Empty}</TableCell>
                                </TableRow>
                            ) : (
                                employees.map((emp) => (
                                    <TableRow key={emp.id} className="hover:bg-slate-50/50">
                                        <TableCell className="text-center font-mono text-xs">{emp.code}</TableCell>
                                        <TableCell className="text-center font-bold text-slate-700">{emp.name}</TableCell>
                                        <TableCell className="text-center font-mono text-xs">{emp.phone || "-"}</TableCell>
                                        <TableCell className="text-center font-bold text-blue-600 font-mono">{Number(emp.basicSalary).toFixed(2)}</TableCell>
                                        <TableCell className="text-center text-xs text-slate-500">{emp.address || "-"}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(emp)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)} className="text-red-600">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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
