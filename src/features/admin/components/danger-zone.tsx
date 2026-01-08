"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { factoryReset } from "@/features/admin/actions";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2 } from "lucide-react";

export function DangerZone() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    // Hardcoded special password for now as requested
    const SPECIAL_PASSWORD = "0000";

    const handleFactoryReset = async () => {
        if (password !== SPECIAL_PASSWORD) {
            setError("كلمة المرور غير صحيحة");
            return;
        }

        setLoading(true);
        try {
            const result = await factoryReset();
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("تمت إعادة ضبط المصنع بنجاح");
                setIsOpen(false);
                // Reload to reflect empty state
                window.location.reload();
            }
        } catch (e) {
            toast.error("حدث خطأ أثناء إعادة الضبط");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-destructive/50">
            <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    إعادة ضبط المصنع ومسح البيانات
                </CardTitle>
                <CardDescription>
                    تتيح لك هذه المنطقة إجراء عمليات تدميرية مثل إعادة تعيين التطبيق إلى حالته الأولية.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-destructive/5 border-destructive/20 gap-4">
                    <div className="space-y-1">
                        <h4 className="font-semibold text-destructive flex items-center gap-2">
                            إعادة ضبط المصنع بالكامل
                        </h4>
                        <p className="text-sm text-muted-foreground max-w-xl">
                            حذف جميع بيانات العمل بشكل دائم بما في ذلك الفواتير، العملاء، المنتجات، والعمليات المالية.
                            <strong> حسابات المستخدمين والإعدادات ستبقى كما هي.</strong>
                        </p>
                    </div>
                    <Dialog open={isOpen} onOpenChange={(val) => {
                        setIsOpen(val);
                        if (!val) {
                            setPassword("");
                            setError("");
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button variant="destructive" className="shrink-0 w-full sm:w-auto">
                                <Trash2 className="h-4 w-4 ml-2" />
                                مسح كافة البيانات
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="text-destructive flex items-center gap-2 text-right">
                                    <AlertTriangle className="h-5 w-5" />
                                    مطلوب فحص أمني
                                </DialogTitle>
                                <DialogDescription className="text-right">
                                    هذا الإجراء <strong>غير قابل للتراجع</strong>. يرجى إدخال كلمة مرور الأمان لتأكيد حذف جميع البيانات.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4 text-right" dir="rtl">
                                <div className="space-y-2">
                                    <Label htmlFor="password">كلمة مرور الأمان</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="أدخل كلمة المرور للتأكيد"
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                setError("");
                                            }}
                                            className={error ? "border-destructive" : ""}
                                        />
                                    </div>
                                    {error && <p className="text-sm text-destructive">{error}</p>}
                                    <p className="text-xs text-muted-foreground">كلمة المرور الافتراضية هي 0000</p>
                                </div>
                            </div>

                            <DialogFooter className="flex gap-2 sm:justify-start">
                                <Button variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleFactoryReset}
                                    disabled={loading || !password}
                                >
                                    {loading ? "جاري مسح البيانات..." : "تأكيد المسح"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    );
}
