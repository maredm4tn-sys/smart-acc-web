"use client";

import { useState, useTransition } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash, FileBarChart } from "lucide-react";
import { deleteRepresentative } from "../actions";
import { toast } from "sonner";
import { AddRepresentativeDialog } from "./add-representative-dialog"; // Reuse the dialog we just created

interface Props {
    representative: any; // We can type this strictly if we export type from schema or actions
    dict: any;
}

export function RepresentativeActions({ representative, dict }: Props) {
    const [isPending, startTransition] = useTransition();
    const [editOpen, setEditOpen] = useState(false);

    const handleDelete = () => {
        if (confirm(dict.Common?.DeleteConfirm || "Are you sure?")) {
            startTransition(async () => {
                const res = await deleteRepresentative(representative.id);
                if (res.success) toast.success(dict.Common?.DeleteSuccess || "Deleted successfully");
                else toast.error(res.message || dict.Common?.DeleteError || "Error deleting");
            });
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{dict.Representatives.Table.Actions}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <Pencil className="mr-2 h-4 w-4" /> {dict.Representatives.Table.Edit}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <a href={`/dashboard/representatives/${representative.id}`} className="flex items-center">
                            <FileBarChart className="mr-2 h-4 w-4 text-blue-600" />
                            {dict.Representatives?.Table?.ViewReport || "View Report"}
                        </a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                        <Trash className="mr-2 h-4 w-4" /> {dict.Representatives.Table.Delete}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AddRepresentativeDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                editMode={true}
                initialData={representative}
            />
        </>
    );
}
