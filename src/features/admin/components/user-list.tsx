"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toggleUserStatus, adminResetPassword } from "@/features/admin/actions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserListProps {
    users: any[];
}

export function UserList({ users }: UserListProps) {
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [password, setPassword] = useState("");
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

    const handleToggleStatus = async (userId: string) => {
        try {
            const result = await toggleUserStatus(userId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(`User status updated to ${result.newStatus}`);
            }
        } catch (e) {
            toast.error("Failed to toggle status");
        }
    };

    const handleResetPassword = async () => {
        if (!selectedUser || !password) return;
        try {
            const result = await adminResetPassword(selectedUser.id, password);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Password reset successfully");
                setIsPasswordDialogOpen(false);
                setPassword("");
                setSelectedUser(null);
            }
        } catch (e) {
            toast.error("Failed to reset password");
        }
    };

    const openPasswordReset = (user: any) => {
        setSelectedUser(user);
        setIsPasswordDialogOpen(true);
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell>
                                <div className="font-medium">{user.fullName}</div>
                                <div className="text-sm text-muted-foreground">{user.username}</div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline">{user.role}</Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={user.status === 'ACTIVE' ? 'default' : 'destructive'}>
                                    {user.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {user.isActive ? "Yes" : "No"}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => handleToggleStatus(user.id)}>
                                            {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openPasswordReset(user)}>
                                            Reset Password
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Enter a new password for {selectedUser?.fullName}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleResetPassword}>Save changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
