"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toggleUserStatus, adminResetPassword, createSubscriber, deleteSubscriber } from "@/features/admin/actions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface UserListProps {
    users: any[];
}

export function UserList({ users }: UserListProps) {
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
                toast.success("Subscriber created successfully");
                setIsCreateDialogOpen(false);
                setNewSubscriber({ organizationName: "", fullName: "", username: "", email: "", password: "" });
            }
        } catch (e) {
            toast.error("Failed to create subscriber");
        }
    };

    const handleDeleteSubscriber = async () => {
        if (!selectedUser) return;
        try {
            const result = await deleteSubscriber(selectedUser.id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Subscriber deleted successfully");
                setIsDeleteDialogOpen(false);
                setSelectedUser(null);
            }
        } catch (e) {
            toast.error("Failed to delete subscriber");
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
                    <Plus className="mr-2 h-4 w-4" /> Create Subscriber
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Organization</TableHead>
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
                                <TableCell className="font-medium">
                                    {user.organizationName || "N/A"}
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium">{user.fullName}</div>
                                    <div className="text-sm text-muted-foreground">{user.username}</div>
                                    <div className="text-xs text-muted-foreground">{user.email}</div>
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
                                            <DropdownMenuItem onClick={() => openDeleteDialog(user)} className="text-red-600 focus:text-red-600">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* Password Reset Dialog */}
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

                {/* Create Subscriber Dialog */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Subscriber</DialogTitle>
                            <DialogDescription>
                                This will create a new Tenant and an Admin user for it.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Organization Name</Label>
                                <Input
                                    value={newSubscriber.organizationName}
                                    onChange={(e) => setNewSubscriber({ ...newSubscriber, organizationName: e.target.value })}
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Full Name</Label>
                                <Input
                                    value={newSubscriber.fullName}
                                    onChange={(e) => setNewSubscriber({ ...newSubscriber, fullName: e.target.value })}
                                    placeholder="Admin Name"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Username</Label>
                                <Input
                                    value={newSubscriber.username}
                                    onChange={(e) => setNewSubscriber({ ...newSubscriber, username: e.target.value })}
                                    placeholder="admin_acme"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Email (Optional)</Label>
                                <Input
                                    value={newSubscriber.email}
                                    onChange={(e) => setNewSubscriber({ ...newSubscriber, email: e.target.value })}
                                    placeholder="admin@acme.com"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Password</Label>
                                <Input
                                    type="password"
                                    value={newSubscriber.password}
                                    onChange={(e) => setNewSubscriber({ ...newSubscriber, password: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateSubscriber}>Create Subscriber</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the subscriber
                                <strong> {selectedUser?.fullName} </strong>
                                and their entire organization <strong> {selectedUser?.organizationName} </strong>
                                including ALL data (Invoices, Products, etc.).
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteSubscriber} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
