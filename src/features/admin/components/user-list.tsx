"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Plus, Trash2, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toggleUserStatus, adminResetPassword, createSubscriber, deleteSubscriber } from "@/features/admin/actions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useTranslation } from "@/components/providers/i18n-provider";
import Link from "next/link";

interface UserListProps {
    users: any[];
}

export function UserList({ users }: UserListProps) {
    const { dict, dir } = useTranslation();
    const t = dict.SubscriberManagement;

    const [selectedUser, setSelectedUser] = useState<any>(null);

    // Password Reset State
    const [password, setPassword] = useState("");
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

    // Create Subscriber State
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newSubscriber, setNewSubscriber] = useState({
        organizationName: "",
        fullName: "",
        username: "",
        email: "",
        password: ""
    });

    // Delete State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleToggleStatus = async (userId: string) => {
        try {
            const result = await toggleUserStatus(userId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(dict.Common.StatusUpdated.replace("{status}", result.newStatus));
            }
        } catch (e) {
            toast.error(dict.Common.Error || "Failed to toggle status");
        }
    };

    const handleResetPassword = async () => {
        if (!selectedUser || !password) return;
        try {
            const result = await adminResetPassword(selectedUser.id, password);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(dict.Common.Success || "Password reset successfully");
                setIsPasswordDialogOpen(false);
                setPassword("");
                setSelectedUser(null);
            }
        } catch (e) {
            toast.error(dict.Common.Error || "Failed to reset password");
        }
    };

    const handleCreateSubscriber = async () => {
        if (!newSubscriber.organizationName || !newSubscriber.fullName || !newSubscriber.username || !newSubscriber.password) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            const result = await createSubscriber(newSubscriber);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(dict.Common.Success || "Subscriber created successfully");
                setIsCreateDialogOpen(false);
                setNewSubscriber({ organizationName: "", fullName: "", username: "", email: "", password: "" });
            }
        } catch (e) {
            toast.error(dict.Common.Error || "Failed to create subscriber");
        }
    };

    const handleDeleteSubscriber = async () => {
        if (!selectedUser) return;
        try {
            const result = await deleteSubscriber(selectedUser.id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(dict.Common.Success || "Subscriber deleted successfully");
                setIsDeleteDialogOpen(false);
                setSelectedUser(null);
            }
        } catch (e) {
            toast.error(dict.Common.Error || "Failed to delete subscriber");
        }
    };

    const openPasswordReset = (user: any) => {
        setSelectedUser(user);
        setIsPasswordDialogOpen(true);
    };

    const openDeleteDialog = (user: any) => {
        setSelectedUser(user);
        setIsDeleteDialogOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className={dir === 'rtl' ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                    {t.CreateButton}
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-start">{t.Table.Organization}</TableHead>
                            <TableHead className="text-start">{t.Table.User}</TableHead>
                            <TableHead className="text-start">{t.Table.Role}</TableHead>
                            <TableHead className="text-center">فواتير (شهر)</TableHead>
                            <TableHead className="text-center">كاشير</TableHead>
                            <TableHead className="text-start">{t.Table.Status}</TableHead>
                            <TableHead className="text-start">{t.Table.Active}</TableHead>
                            <TableHead className="text-center">{t.Table.Actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium text-start">
                                    {user.organizationName || dict.Common.NA}
                                </TableCell>
                                <TableCell className="text-start">
                                    <div className="font-medium">{user.fullName}</div>
                                    <div className="text-sm text-muted-foreground">{user.username}</div>
                                    <div className="text-xs text-muted-foreground">{user.email}</div>
                                </TableCell>
                                <TableCell className="text-start">
                                    <Badge variant="outline">{user.role}</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1 font-medium">
                                        📄 {user.invoiceCount || 0}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1 font-medium">
                                        👤 {user.cashierCount || 0}
                                    </div>
                                </TableCell>
                                <TableCell className="text-start">
                                    <Badge variant={user.status === 'ACTIVE' ? 'default' : 'destructive'}>
                                        {user.status === 'ACTIVE' ? t.Table.Active : user.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-start">
                                    {user.isActive ? <Badge variant="default" className="bg-green-600">{dict.Common.Yes}</Badge> : <Badge variant="secondary">{dict.Common.No}</Badge>}
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex justify-center">
                                        <Link href={`/dashboard/settings/subscribers/${user.id}`}>
                                            <Button variant="outline" size="sm">
                                                {t.ControlPanel.Title}
                                            </Button>
                                        </Link>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* Password Reset Dialog */}
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t.Actions.ResetPassword}</DialogTitle>
                            <DialogDescription>
                                Enter a new password for {selectedUser?.fullName}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="new-password">{t.Dialogs.Form.Password}</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>{t.Dialogs.Cancel}</Button>
                            <Button onClick={handleResetPassword}>{t.Dialogs.Form.Password}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Create Subscriber Dialog */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t.Dialogs.CreateTitle}</DialogTitle>
                            <DialogDescription>
                                {t.Dialogs.CreateDesc}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>{t.Dialogs.Form.Organization}</Label>
                                <Input
                                    value={newSubscriber.organizationName}
                                    onChange={(e) => setNewSubscriber({ ...newSubscriber, organizationName: e.target.value })}
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t.Dialogs.Form.FullName}</Label>
                                <Input
                                    value={newSubscriber.fullName}
                                    onChange={(e) => setNewSubscriber({ ...newSubscriber, fullName: e.target.value })}
                                    placeholder="Admin Name"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t.Dialogs.Form.Username}</Label>
                                <Input
                                    value={newSubscriber.username}
                                    onChange={(e) => setNewSubscriber({ ...newSubscriber, username: e.target.value })}
                                    placeholder="admin_acme"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t.Dialogs.Form.Email}</Label>
                                <Input
                                    value={newSubscriber.email}
                                    onChange={(e) => setNewSubscriber({ ...newSubscriber, email: e.target.value })}
                                    placeholder="admin@acme.com"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t.Dialogs.Form.Password}</Label>
                                <Input
                                    type="password"
                                    value={newSubscriber.password}
                                    onChange={(e) => setNewSubscriber({ ...newSubscriber, password: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>{t.Dialogs.Cancel}</Button>
                            <Button onClick={handleCreateSubscriber}>{t.CreateButton}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t.Dialogs.DeleteTitle}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t.Dialogs.DeleteMessage}
                                <br />
                                <strong> {selectedUser?.organizationName} </strong>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t.Dialogs.Cancel}</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteSubscriber} className="bg-red-600 hover:bg-red-700">{t.Dialogs.ConfirmDelete}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
