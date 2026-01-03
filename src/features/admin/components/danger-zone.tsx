"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { factoryReset } from "@/features/admin/actions";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function DangerZone() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleFactoryReset = async () => {
        setLoading(true);
        try {
            const result = await factoryReset();
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Factory reset completed successfully");
                setIsOpen(false);
            }
        } catch (e) {
            toast.error("An error occurred during reset");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                    Irreversible actions. Tread carefully.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-destructive/10 border-destructive/20">
                    <div>
                        <h4 className="font-semibold text-destructive">Factory Reset</h4>
                        <p className="text-sm text-muted-foreground">
                            Deletes all invoices, products, customers, and transactions. User accounts are preserved.
                        </p>
                    </div>
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="destructive">Factory Reset</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Are you absolutely sure?</DialogTitle>
                                <DialogDescription>
                                    This action cannot be undone. This will permanently delete all operational data from the system.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                                <Button variant="destructive" onClick={handleFactoryReset} disabled={loading}>
                                    {loading ? "Resetting..." : "Yes, Delete Everything"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    );
}
