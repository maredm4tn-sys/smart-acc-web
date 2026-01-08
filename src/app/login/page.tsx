"use client";

import { useActionState } from "react";
import { login } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider"; // Hook

const initialState = {
    error: "",
};

export default function LoginPage() {
    // Note: useActionState (React 19) or useFormState (React 18/Next 14)
    // Assuming Next.js 15+ / React 19 environment based on package.json
    const [state, formAction, isPending] = useActionState(login, initialState);
    const { dict } = useTranslation();

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-10">
                    <div className="relative h-48 w-48">
                        <Image
                            src="/logo.png"
                            alt={dict.Logo}
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>

                <Card className="border-none shadow-xl">
                    <CardHeader className="text-center space-y-1">
                        <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">{dict.Login.Title}</CardTitle>
                        <CardDescription className="text-gray-500">
                            {dict.Login.Description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={formAction} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">{dict.Login.Username}</Label>
                                <Input
                                    id="username"
                                    name="username"
                                    placeholder="admin"
                                    required
                                    className="font-mono text-left dir-ltr"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">{dict.Login.Password}</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="font-mono text-left dir-ltr"
                                />
                            </div>

                            {state?.error && (
                                <div className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-lg text-center">
                                    {state.error}
                                </div>
                            )}

                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-bold" disabled={isPending}>
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {dict.Login.Submit}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-slate-400 mt-8 font-mono">
                    Smart Accountant System v2.0
                </p>
            </div>
        </div>
    );
}
