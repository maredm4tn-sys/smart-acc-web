"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUser } from "@/features/auth/actions";
import { Loader2, Plus } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";

export function AddUserDialog() {
    const { dict: rawDict } = useTranslation();
    const dict = rawDict as any;
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            const res = await createUser(
                formData.get("fullName") as string,
                formData.get("username") as string,
                formData.get("password") as string,
                formData.get("role") as 'admin' | 'cashier',
                formData.get("phone") as string,   // Phone
                formData.get("address") as string  // Address
            );

            if (res?.error) {
                alert(res.error); // Fallback
            } else {
                setOpen(false);
                // toast.success("User created");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Plus size={16} />
                    {dict.Users.NewUser}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{dict.Users.Dialog.Title}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label>{dict.Users.Dialog.FullName}</Label>
                        <Input name="fullName" required placeholder={dict.Users.Dialog.Placeholders.Name} />
                    </div>
                    <div className="space-y-2">
                        <Label>{dict.Users.Dialog.Username}</Label>
                        <Input name="username" required placeholder={dict.Users.Dialog.Placeholders.Username} className="font-mono dir-ltr text-left" />
                    </div>
                    <div className="space-y-2">
                        <Label>{dict.Users.Dialog.Password}</Label>
                        <Input name="password" type="password" required className="font-mono dir-ltr text-left" />
                    </div>
                    <div className="space-y-2">
                        <Label>{dict.Users.Dialog.Role}</Label>
                        <select name="role" className="w-full flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                            <option value="cashier">{dict.Users.Dialog.Roles.Cashier}</option>
                            <option value="admin">{dict.Users.Dialog.Roles.Admin}</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{dict.Users.Dialog.Phone}</Label>
                            <Input name="phone" placeholder={dict.Users.Dialog.Placeholders.Phone} />
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Users.Dialog.Address}</Label>
                            <Input name="address" placeholder={dict.Users.Dialog.Placeholders.Address} />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>{dict.Users.Dialog.Cancel}</Button>
                        <Button type="submit" disabled={loading} className="bg-blue-600">
                            {loading ? <Loader2 className="animate-spin" /> : dict.Users.Dialog.Save}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
