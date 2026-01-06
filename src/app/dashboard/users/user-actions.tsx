"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteUser, updateUser } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface UserActionsProps {
    user: any;
}

export function UserActions({ user }: UserActionsProps) {
    const [editOpen, setEditOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!confirm("هل أنت متأكد من حذف هذا المستخدم؟")) return;

        const res = await deleteUser(user.id);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("تم الحذف بنجاح");
        }
    };

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        const res = await updateUser({
            id: user.id,
            fullName: formData.get("fullName") as string,
            username: formData.get("username") as string,
            password: formData.get("password") as string,
            role: formData.get("role") as 'admin' | 'cashier',
            phone: formData.get("phone") as string,
            address: formData.get("address") as string,
        });

        setLoading(false);

        if (res.error) {
            toast.error(res.error);
        } else {
            setEditOpen(false);
            toast.success("تم التعديل بنجاح");
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <Pencil className="mr-2 h-4 w-4" /> تعديل
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" /> حذف
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <Label>الاسم الكامل</Label>
                            <Input name="fullName" defaultValue={user.fullName} required />
                        </div>
                        <div className="space-y-2">
                            <Label>اسم المستخدم</Label>
                            <Input name="username" defaultValue={user.username} required className="dir-ltr text-left" />
                        </div>
                        <div className="space-y-2">
                            <Label>كلمة المرور (اتركه فارغاً للإبقاء عليه)</Label>
                            <Input name="password" type="password" className="dir-ltr text-left" placeholder="*******" />
                        </div>
                        <div className="space-y-2">
                            <Label>الصلاحية</Label>
                            <select name="role" defaultValue={user.role} className="w-full h-10 rounded border border-input p-2 bg-transparent">
                                <option value="cashier">Cashier</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>رقم الهاتف</Label>
                                <Input name="phone" defaultValue={user.phone || ''} placeholder="01xxxxxxxxx" />
                            </div>
                            <div className="space-y-2">
                                <Label>العنوان</Label>
                                <Input name="address" defaultValue={user.address || ''} placeholder="العنوان..." />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} حفظ التعديلات
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
