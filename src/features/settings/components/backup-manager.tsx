"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Download, Upload, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createFullBackup } from "@/features/settings/actions/backup";

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
    const [isDesktop, setIsDesktop] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.electron) {
            setIsDesktop(true);
        }
    }, []);

    if (!isDesktop) {
        return null;
    }

    const handleBackup = async () => {
        if (!window.electron) return;
        setLoading(true);
        try {
            // 1. Get Path from Electron Dialog
            const dialogResult = await window.electron.backupCreate();

            if (dialogResult.canceled || !dialogResult.path) {
                setLoading(false);
                return;
            }

            // 2. Perform ACTUAL Backup via Server Action (VACUUM INTO)
            const result = await createFullBackup(dialogResult.path);

            if (result.success) {
                toast.success("تم النسخ الاحتياطي بنجاح", {
                    description: `تم حفظ الملف في: ${dialogResult.path}`
                });
            } else {
                toast.error("فشل النسخ الاحتياطي", { description: result.error });
            }
        } catch (error) {
            console.error(error);
            toast.error("حدث خطأ غير متوقع");
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        if (!window.electron) return;

        if (!confirm("تحذير خطير: استعادة نسخة احتياطية ستقوم بحذف جميع البيانات الحالية نهائياً واستبدالها بالنسخة المختارة.\n\nهل أنت متأكد أنك تريد المتابعة؟")) {
            return;
        }

        setLoading(true);
        try {
            const result = await window.electron.backupRestore();
            if (result.success) {
                toast.success("تمت العملية بنجاح", {
                    description: "يتم الآن إعادة تشغيل التطبيق..."
                });
            } else if (result.error) {
                toast.error("فشل الاستعادة", { description: result.error });
            }
        } catch (error) {
            toast.error("حدث خطأ غير متوقع");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-green-600/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-green-600" />
                    النسخ الاحتياطي والاستعادة (Desktop)
                </CardTitle>
                <CardDescription>
                    ميزة حصرية لنسخة سطح المكتب: احفظ بياناتك في ملف خارجي أو استرجعها عند الحاجة.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>تنبيه هام</AlertTitle>
                    <AlertDescription>
                        استعادة نسخة قديمة تعني أنك ستفقد أي بيانات (فواتير/عملاء) تم إضافتها بعد تاريخ تلك النسخة.
                        <br />
                        يفضل دائماً أخذ نسخة احتياطية جديدة قبل القيام بعملية الاستعادة.
                    </AlertDescription>
                </Alert>

                <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                        onClick={handleBackup}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                        <Download className="ml-2 h-4 w-4" />
                        حفظ نسخة احتياطية الآن
                    </Button>

                    <Button
                        onClick={handleRestore}
                        disabled={loading}
                        variant="destructive"
                        className="flex-1"
                    >
                        <Upload className="ml-2 h-4 w-4" />
                        استعادة نسخة من ملف
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
