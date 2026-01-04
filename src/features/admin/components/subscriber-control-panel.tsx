"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Edit2, Save, X, Phone, Mail, Building, Briefcase, FileText, Settings, Key } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { toggleUserStatus, deleteSubscriber, updateTenant, adminResetPassword, resetSubscriberData } from "@/features/admin/actions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface SubscriberControlPanelProps {
    tenant: any;
    user: any;
    stats: {
        invoiceCount: number;
        productCount: number;
    };
    dict: any;
    lang: string;
}

export function SubscriberControlPanel({ tenant, user, stats, dict, lang }: SubscriberControlPanelProps) {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const t = dict.SubscriberManagement.ControlPanel;
    const router = useRouter();

    const [isEditing, setIsEditing] = useState(false);
    const [currentStatus, setCurrentStatus] = useState<'ACTIVE' | 'SUSPENDED'>(user.status);
    const [formData, setFormData] = useState({
        name: tenant.name,
        email: tenant.email || "",
        phone: tenant.phone || "",
        activityType: tenant.activityType || "",
        subscriptionStartDate: tenant.subscriptionStartDate ? new Date(tenant.subscriptionStartDate).toISOString().split('T')[0] : "",
        nextRenewalDate: tenant.nextRenewalDate ? new Date(tenant.nextRenewalDate).toISOString().split('T')[0] : "",
        customerRating: tenant.customerRating || "Normal",
        adminNotes: tenant.adminNotes || "",
    });

    // Password Reset State
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [newPassword, setNewPassword] = useState("");

    // Factory Reset State
    const [resetConfirmation, setResetConfirmation] = useState("");

    const handleSave = async () => {
        try {
            const dataToSave = {
                ...formData,
                subscriptionStartDate: formData.subscriptionStartDate ? new Date(formData.subscriptionStartDate) : null,
                nextRenewalDate: formData.nextRenewalDate ? new Date(formData.nextRenewalDate) : null,
            };

            const result = await updateTenant(tenant.id, dataToSave);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Profile updated successfully");
                setIsEditing(false);
                router.refresh();
            }
        } catch (e) {
            toast.error("Failed to update profile");
        }
    };

    const handleToggleStatus = async () => {
        const oldStatus = currentStatus;
        const newStatus = oldStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        setCurrentStatus(newStatus);

        try {
            const result = await toggleUserStatus(user.id);
            if (result.error) {
                toast.error(result.error);
                setCurrentStatus(oldStatus);
            } else {
                toast.success(`User status updated to ${result.newStatus}`);
                router.refresh();
            }
        } catch (e) {
            toast.error("Failed to toggle status");
            setCurrentStatus(oldStatus);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword) return;
        try {
            const result = await adminResetPassword(user.id, newPassword);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Password reset successfully");
                setIsPasswordDialogOpen(false);
                setNewPassword("");
            }
        } catch (e) {
            toast.error("Failed to reset password");
        }
    };

    const handleDelete = async () => {
        try {
            const result = await deleteSubscriber(user.id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Subscriber deleted successfully");
                router.push("/dashboard/settings");
            }
        } catch (e) {
            toast.error("Failed to delete subscriber");
        }
    };

    const handleFactoryReset = async () => {
        if (resetConfirmation !== "RESET") return;

        try {
            const result = await resetSubscriberData(tenant.id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Factory reset completed successfully");
                setResetConfirmation("");
                router.refresh();
            }
        } catch (e) {
            toast.error("Failed to perform factory reset");
        }
    };

    return (
        <div className="space-y-6" dir={dir}>
            {/* Top Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{dict.SubscriberManagement.Table.Status}</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            <Button
                                variant="outline"
                                className={`text-lg px-3 py-1 h-auto ${currentStatus === 'ACTIVE' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200'}`}
                                onClick={handleToggleStatus}
                            >
                                {currentStatus === 'ACTIVE' ? dict.SubscriberManagement.Table.Active : dict.SubscriberManagement.Table.Suspended}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{dict.Dashboard.InvoicesCount}</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.invoiceCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{dict.Dashboard.ActiveProducts}</CardTitle>
                        <Settings className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.productCount}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Profile */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="col-span-2">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>{t.OrganizationProfile}</CardTitle>
                                <CardDescription>{t.ContactInfo}</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => setIsPasswordDialogOpen(true)}>
                                    <Key className={`${dir === 'rtl' ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                                    {dict.SubscriberManagement.Actions.ResetPassword}
                                </Button>
                                {!isEditing ? (
                                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                                        <Edit2 className={`${dir === 'rtl' ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                                        {t.Edit}
                                    </Button>
                                ) : (
                                    <>
                                        <Button variant="ghost" onClick={() => setIsEditing(false)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                        <Button onClick={handleSave}>
                                            <Save className={`${dir === 'rtl' ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                                            {t.Save}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t.OrganizationProfile}</Label>
                                <div className="relative">
                                    <Building className={`absolute top-2.5 h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        disabled={!isEditing}
                                        className={dir === 'rtl' ? 'pr-9' : 'pl-9'}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t.ActivityType}</Label>
                                <div className="relative">
                                    <Briefcase className={`absolute top-2.5 h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                                    <Input
                                        value={formData.activityType}
                                        onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
                                        disabled={!isEditing}
                                        className={dir === 'rtl' ? 'pr-9' : 'pl-9'}
                                        placeholder="e.g. Retail, Tech"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t.Email}</Label>
                                <div className="relative">
                                    <Mail className={`absolute top-2.5 h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                                    <Input
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        disabled={!isEditing}
                                        className={dir === 'rtl' ? 'pr-9' : 'pl-9'}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t.Phone}</Label>
                                <div className="relative">
                                    <Phone className={`absolute top-2.5 h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        disabled={!isEditing}
                                        className={dir === 'rtl' ? 'pr-9' : 'pl-9'}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* CRM & Subscription Section */}
                <Card className="col-span-2 shadow-sm border-blue-100 bg-blue-50/20">
                    <CardHeader>
                        <CardTitle className="text-blue-900">{t.CRM.Title}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label>{t.CRM.SubscriptionStart}</Label>
                                <Input
                                    type="date"
                                    value={formData.subscriptionStartDate}
                                    onChange={(e) => setFormData({ ...formData, subscriptionStartDate: e.target.value })}
                                    disabled={!isEditing}
                                    className="bg-white"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t.CRM.NextRenewal}</Label>
                                <Input
                                    type="date"
                                    value={formData.nextRenewalDate}
                                    onChange={(e) => setFormData({ ...formData, nextRenewalDate: e.target.value })}
                                    disabled={!isEditing}
                                    className="bg-white"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t.CRM.CustomerRating}</Label>
                                <Select
                                    value={formData.customerRating}
                                    onValueChange={(val) => setFormData({ ...formData, customerRating: val })}
                                    disabled={!isEditing}
                                >
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Select Rating" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="VIP">{t.CRM.Ratings.VIP}</SelectItem>
                                        <SelectItem value="Normal">{t.CRM.Ratings.Normal}</SelectItem>
                                        <SelectItem value="Difficult">{t.CRM.Ratings.Difficult}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.CRM.AdminNotes}</Label>
                            <textarea
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Type private admin notes here..."
                                value={formData.adminNotes}
                                onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
                                disabled={!isEditing}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Danger Zone */}
            <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/10">
                <CardHeader>
                    <CardTitle className="text-red-600 font-bold">{t.DangerZone}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-lg border border-red-200 mt-4">
                        <div>
                            <h4 className="font-semibold text-red-600">Factory Reset Data</h4>
                            <p className="text-sm text-muted-foreground">Wipe all invoices, products, and transactions.</p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="bg-red-700 hover:bg-red-800">Factory Reset</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Factory Reset Data (Operational Wipe)</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete ALL **Invoices, Products, Customers, and Transactions** for this subscriber.
                                        <br /><br />
                                        The organization account and user login will remain active.
                                        <br /><br />
                                        Type <strong>RESET</strong> to confirm.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-2">
                                    <Input
                                        value={resetConfirmation}
                                        onChange={(e) => setResetConfirmation(e.target.value)}
                                        placeholder="Type RESET to confirm"
                                    />
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setResetConfirmation("")}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleFactoryReset}
                                        disabled={resetConfirmation !== "RESET"}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        Confirm Reset
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-lg border border-red-200">
                        <div>
                            <h4 className="font-semibold text-red-600">{t.Delete.Title}</h4>
                            <p className="text-sm text-muted-foreground">{t.Delete.Desc}</p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">{t.Delete.Button}</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{dict.SubscriberManagement.Dialogs.DeleteTitle}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {dict.SubscriberManagement.Dialogs.DeleteMessage}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{t.Cancel}</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                                        {t.Delete.Button}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
            </Card>

            {/* Password Reset Dialog */}
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{dict.SubscriberManagement.Actions.ResetPassword}</DialogTitle>
                        <DialogDescription>
                            Enter a new password for this user.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>{t.Cancel}</Button>
                        <Button onClick={handleResetPassword}>Reset Password</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
