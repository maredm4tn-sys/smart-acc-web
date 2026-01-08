"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Download, Upload, AlertTriangle, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createFullBackup } from "@/features/settings/actions/backup";
import { factoryReset } from "@/features/settings/actions/reset";
import { useTranslation } from "@/components/providers/i18n-provider";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

interface ElectronAPI {
    backupCreate: () => Promise<{ success: boolean; path?: string; error?: string; canceled?: boolean }>;
    backupRestore: () => Promise<{ success: boolean; error?: string }>;
}

declare global {
    interface Window {
        electron?: ElectronAPI;
    }
}

export function BackupManager() {
    const { dict } = useTranslation();
    const [isDesktop, setIsDesktop] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.electron) {
            setIsDesktop(true);
        }
    }, []);

    if (!isDesktop) {
        return null; // Or return a message saying this feature is desktop only
    }

    const handleBackup = async () => {
        if (!window.electron) return;
        setLoading(true);
        try {
            const dialogResult = await window.electron.backupCreate();

            if (dialogResult.canceled || !dialogResult.path) {
                setLoading(false);
                return;
            }

            const result = await createFullBackup(dialogResult.path);

            if (result.success) {
                toast.success(dict.Settings.Backup.Messages.BackupSuccess, {
                    description: dict.Settings.Backup.Messages.SavedTo.replace("{path}", dialogResult.path)
                });
            } else {
                toast.error(dict.Settings.Backup.Messages.BackupFailed, { description: result.error });
            }
        } catch (error) {
            console.error(error);
            toast.error(dict.Settings.Backup.Messages.UnexpectedError);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        if (!window.electron) return;

        if (!confirm(dict.Settings.Backup.Messages.RestoreWarning)) {
            return;
        }

        setLoading(true);
        try {
            const result = await window.electron.backupRestore();
            if (result.success) {
                toast.success(dict.Settings.Backup.Messages.RestoreSuccess, {
                    description: dict.Settings.Backup.Messages.Restarting
                });
            } else if (result.error) {
                toast.error(dict.Settings.Backup.Messages.RestoreFailed, { description: result.error });
            }
        } catch (error) {
            toast.error(dict.Settings.Backup.Messages.UnexpectedError);
        } finally {
            setLoading(false);
        }
    };

    const handleFactoryReset = async () => {
        setLoading(true);
        try {
            const result = await factoryReset();
            if (result.success) {
                toast.success(dict.Settings.FactoryReset?.Success || "Factory reset successful");
                // Optional: Force reload or logout?
                window.location.reload();
            } else {
                toast.error(dict.Settings.FactoryReset?.Error || "Factory reset failed", { description: result.error });
            }
        } catch (error) {
            toast.error("Error during reset");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-green-600/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-green-600" />
                    {dict.Settings.Backup.Title}
                </CardTitle>
                <CardDescription>
                    {dict.Settings.Backup.Description}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{dict.Settings.Backup.AlertTitle}</AlertTitle>
                    <AlertDescription>
                        {dict.Settings.Backup.AlertDescription}
                    </AlertDescription>
                </Alert>

                <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                        onClick={handleBackup}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                        <Download className="ml-2 h-4 w-4" />
                        {dict.Settings.Backup.BackupNow}
                    </Button>

                    <Button
                        onClick={handleRestore}
                        disabled={loading}
                        variant="outline"
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                    >
                        <Upload className="ml-2 h-4 w-4" />
                        {dict.Settings.Backup.RestoreFromFile}
                    </Button>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200 dark:border-slate-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            {dict.Settings.FactoryReset?.Button || "Danger Zone"}
                        </span>
                    </div>
                </div>

                <div className="flex justify-center">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full sm:w-auto min-w-[200px]" disabled={loading}>
                                <Trash2 className="ml-2 h-4 w-4" />
                                {dict.Settings.FactoryReset?.Button || "Factory Reset"}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{dict.Settings.FactoryReset?.DialogTitle || "Are you sure?"}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {dict.Settings.FactoryReset?.DialogDesc || "This will wipe all data."}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{dict.Settings.FactoryReset?.Cancel || "Cancel"}</AlertDialogCancel>
                                <AlertDialogAction onClick={handleFactoryReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    {dict.Settings.FactoryReset?.Confirm || "Yes, Delete Everything"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>
    );
}
