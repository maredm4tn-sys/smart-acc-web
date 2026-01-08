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
import { useTranslation } from "@/components/providers/i18n-provider";

export function DangerZone() {
    const { dict } = useTranslation() as any;
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    // Hardcoded special password for now as requested
    const SPECIAL_PASSWORD = "0000";

    const handleFactoryReset = async () => {
        if (password !== SPECIAL_PASSWORD) {
            setError(dict.Settings.FactoryReset.InvalidPassword);
            return;
        }

        setLoading(true);
        try {
            const result = await factoryReset();
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(dict.Settings.FactoryReset.Success);
                setIsOpen(false);
                // Reload to reflect empty state
                window.location.reload();
            }
        } catch (e) {
            toast.error(dict.Settings.FactoryReset.Error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-destructive/50">
            <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    {dict.Settings.FactoryReset.Title}
                </CardTitle>
                <CardDescription>
                    {dict.Settings.FactoryReset.Description}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-destructive/5 border-destructive/20 gap-4">
                    <div className="space-y-1">
                        <h4 className="font-semibold text-destructive flex items-center gap-2">
                            {dict.Settings.FactoryReset.FullReset}
                        </h4>
                        <p className="text-sm text-muted-foreground max-w-xl">
                            {dict.Settings.FactoryReset.FullResetDesc}
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
                                <Trash2 className="h-4 w-4 mx-2" />
                                {dict.Settings.FactoryReset.Button}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="text-destructive flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    {dict.Settings.FactoryReset.SecurityCheck}
                                </DialogTitle>
                                <DialogDescription>
                                    {dict.Settings.FactoryReset.SecurityCheckDesc}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">{dict.Settings.FactoryReset.PasswordLabel}</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder={dict.Settings.FactoryReset.PasswordPlaceholder}
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                setError("");
                                            }}
                                            className={error ? "border-destructive" : ""}
                                        />
                                    </div>
                                    {error && <p className="text-sm text-destructive">{error}</p>}
                                    <p className="text-xs text-muted-foreground">{dict.Settings.FactoryReset.DefaultPasswordHint}</p>
                                </div>
                            </div>

                            <DialogFooter className="flex gap-2 sm:justify-start">
                                <Button variant="outline" onClick={() => setIsOpen(false)}>{dict.Common.Cancel || "Cancel"}</Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleFactoryReset}
                                    disabled={loading || !password}
                                >
                                    {loading ? dict.Settings.FactoryReset.Canceling : dict.Settings.FactoryReset.ConfirmButton}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    );
}
