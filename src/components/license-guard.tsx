"use client";

import { useState, useEffect } from "react";
import { LicenseManager } from "@/features/license/license-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function LicenseGuard({ children }: { children: React.ReactNode }) {
    const [isLicensed, setIsLicensed] = useState<boolean | null>(null); // null = loading
    const [machineId, setMachineId] = useState<string>("");
    const [inputKey, setInputKey] = useState("");

    // Detect Mode: Only run Guard in Desktop Mode
    const isDesktop = process.env.NEXT_PUBLIC_APP_MODE === 'desktop';

    useEffect(() => {
        // ALWAYS ALLOW - BYPASS LICENSE CHECK FOR NOW
        setIsLicensed(true);

        /* Original Logic Commented Out
        if (!isDesktop) {
            setIsLicensed(true); // Always allow Web Mode
            return;
        }

        const checkLicense = async () => {
             // ...
        };
        checkLicense(); 
        */
    }, [isDesktop]);

    const handleActivate = async () => {
        if (!inputKey) return;

        const isValid = await LicenseManager.validateLicense(inputKey.trim().toUpperCase());

        if (isValid) {
            LicenseManager.saveLicense(inputKey.trim().toUpperCase());
            setIsLicensed(true);
            toast.success("تم التفعيل بنجاح! شكراً لشرائك النسخة الأصلية.");
        } else {
            toast.error("مفتاح التفعيل غير صحيح لهذا الجهاز!");
        }
    };

    if (isLicensed === null) return <div className="h-screen flex items-center justify-center">Loading Security...</div>;

    if (isLicensed) return <>{children}</>;

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4" dir="rtl">
            <Card className="w-full max-w-md border-red-500/50 shadow-2xl bg-white/95 backdrop-blur">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-800">نسخة غير مفعلة</CardTitle>
                    <p className="text-sm text-slate-500 mt-2">
                        هذه النسخة مخصصة للعمل على جهاز واحد فقط.
                        <br />
                        يرجى إرسال "رمز الجهاز" للحصول على مفتاح التفعيل.
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-slate-100 p-4 rounded-lg text-center border border-slate-200">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">رمز جهازك (Machine ID)</p>
                        <code className="text-lg font-mono font-bold text-slate-900 select-all">{machineId || "جاري القراءة..."}</code>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">مفتاح التفعيل (Activation Key)</label>
                        <Input
                            placeholder="XXXX-XXXX-XXXX-XXXX"
                            className="text-center font-mono uppercase text-lg tracking-widest"
                            value={inputKey}
                            onChange={(e) => setInputKey(e.target.value)}
                        />
                    </div>

                    <Button className="w-full h-12 text-lg gap-2" size="lg" onClick={handleActivate}>
                        <ShieldCheck size={20} />
                        تفعيل النسخة
                    </Button>

                    <div className="text-center text-xs text-slate-400">
                        Smart Accountant Offline v1.0 &copy; 2026
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
