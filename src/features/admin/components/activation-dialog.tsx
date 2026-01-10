
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, Key } from "lucide-react";
import { activateLicense, getLicenseAction } from "../license-actions";
import { toast } from "sonner";
import type { LicenseStatus } from "@/lib/license-check";

export function ActivationDialog({ dict }: { dict: any }) {
    const [open, setOpen] = useState(false);
    const [license, setLicense] = useState<LicenseStatus | null>(null);
    const [key, setKey] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        refreshLicense();
    }, []);

    async function refreshLicense() {
        const l = await getLicenseAction();
        setLicense(l);
        // Automatically open if expired and not activated
        if (!l.isActivated && l.isExpired) {
            setOpen(true);
        }
    }

    async function handleActivate() {
        if (!key) return;
        setLoading(true);
        const res = await activateLicense(key);
        if (res.success) {
            toast.success(dict?.Common?.Success || "Activated Successfully!");
            setOpen(false);
            refreshLicense();
            window.location.reload(); // Refresh to unlock everything
        } else {
            toast.error(res.error || "Invalid Key");
        }
        setLoading(false);
    }

    if (!license) return null;

    return (
        <>
            {/* Status Indicator Floating (Only in Desktop) */}
            {process.env.NEXT_PUBLIC_APP_MODE === 'desktop' && !license.isActivated && (
                <div
                    onClick={() => setOpen(true)}
                    className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] cursor-pointer group flex items-center gap-2 p-1.5 px-4 rounded-full shadow-lg border transition-all hover:bg-white hover:scale-105 backdrop-blur-md ${license.isExpired ? "bg-red-50 border-red-200" : "bg-white/90 border-amber-200"}`}
                >
                    <div className={`p-1 rounded-full ${license.isExpired ? "bg-red-500 text-white" : "bg-amber-500 text-white"}`}>
                        <ShieldCheck className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none">{dict?.Common?.TrialVersion}</p>
                        <p className="text-[11px] font-bold text-slate-900 leading-tight">
                            {license.isExpired ? dict?.Common?.TrialExpired : `${license.trialDaysLeft} ${dict?.Common?.DaysLeft} | ${license.invoicesLeft} ${dict?.Common?.InvoicesLeft}`}
                        </p>
                    </div>
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md bg-white rounded-3xl overflow-hidden border-none shadow-2xl p-0">
                    <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 w-full"></div>

                    <div className="p-8 pt-6">
                        <DialogHeader className="text-center mb-6">
                            <div className="mx-auto w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-4 shadow-inner ring-4 ring-white">
                                <Key className="w-10 h-10 text-blue-600" />
                            </div>
                            <DialogTitle className="text-2xl font-black text-slate-900 mb-2">
                                {dict?.Common?.ActivateNow}
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 font-medium leading-relaxed">
                                {license.isExpired
                                    ? dict?.Common?.TrialExpired
                                    : "استمتع بكافة الميزات والتقارير والطباعة اللامحدودة من خلال تفعيل نسختك الآن."}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{dict?.Common?.DaysLeft}</p>
                                    <p className="text-3xl font-black text-blue-600">{license.trialDaysLeft}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{dict?.Common?.InvoicesLeft}</p>
                                    <p className="text-3xl font-black text-indigo-600">{license.invoicesLeft}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="license-key" className="text-sm font-bold text-slate-700 block text-right">
                                    أدخل كود التفعيل
                                </Label>
                                <Input
                                    id="license-key"
                                    placeholder="XXXX-XXXX-XXXX-XXXX"
                                    value={key}
                                    onChange={(e) => setKey(e.target.value.toUpperCase())}
                                    className="h-14 rounded-2xl font-mono text-center tracking-[0.2em] text-xl border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm"
                                />
                            </div>

                            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 relative z-10">
                                    Your Hardware ID (رقم جهازك)
                                </p>
                                <code className="text-blue-400 font-mono text-xs select-all block break-all relative z-10">
                                    {(license as any).machineId}
                                </code>
                            </div>

                            <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-100 flex gap-4 items-start">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                                </div>
                                <p className="text-xs text-blue-800 font-semibold leading-relaxed text-right">
                                    قم بإرسال <b>رقم الجهاز</b> الموضح أعلاه للمبرمج للحصول على كود التفعيل الخاص بجهازك.
                                </p>
                            </div>
                        </div>

                        <DialogFooter className="mt-8 flex flex-row gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setOpen(false)}
                                className="flex-1 h-13 rounded-2xl font-bold text-slate-500 hover:bg-slate-50"
                            >
                                {dict?.Common?.Cancel}
                            </Button>
                            <Button
                                onClick={handleActivate}
                                disabled={loading || !key}
                                className="flex-[2] h-13 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-200 transition-all hover:-translate-y-0.5"
                            >
                                {loading ? "..." : "تفعيل النسخة الكاملة الآن"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
