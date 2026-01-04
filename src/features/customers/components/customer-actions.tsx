"use client";

import { Button } from "@/components/ui/button";
import { Edit2, Trash2, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { EditCustomerDialog } from "./edit-customer-dialog";
import { deleteCustomer } from "../actions";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CustomerActionsProps {
    customer: {
        id: number;
        name: string;
        companyName?: string | null;
        phone?: string | null;
        email?: string | null;
        address?: string | null;
        taxId?: string | null;
    };
    currentRole?: string;
}

export function CustomerActions({ customer, currentRole }: CustomerActionsProps) {
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const isAdmin = currentRole === 'admin' || currentRole === 'SUPER_ADMIN';

    // If not admin, hide actions for now as per "Hide Edit/Delete" requirement
    if (!isAdmin) return null;

    const handleDelete = async () => {
        const res = await deleteCustomer(customer.id);
        if (res.success) {
            toast.success("Customer Deleted");
        } else {
            toast.error(res.message);
        }
        setDeleteOpen(false);
    };

    return (
        <>
            <div className="flex items-center gap-2 justify-center">
                <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                    <Edit2 size={16} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 size={16} />
                </Button>
            </div>

            <EditCustomerDialog
                customer={customer}
                open={editOpen}
                onOpenChange={setEditOpen}
            />

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will delete <strong>{customer.name}</strong> permanently.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
