"use client";

import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown, Plus, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AccountWithChildren } from "../types";
import { Button } from "@/components/ui/button";
import { deleteAccount } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AccountTreeItemProps {
    account: AccountWithChildren;
    level?: number;
}

function AccountTreeItem({ account, level = 0 }: AccountTreeItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = account.children && account.children.length > 0;
    const router = useRouter();

    // Color coding based on account type
    const typeColors: Record<string, string> = {
        asset: "text-blue-600",
        liability: "text-red-600",
        equity: "text-purple-600",
        revenue: "text-green-600",
        expense: "text-orange-600",
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // Use standard confirm for now
        if (!confirm(`هل أنت متأكد من حذف حساب "${account.name}"؟`)) return;

        try {
            const res = await deleteAccount(account.id);
            if (res.success) {
                toast.success(res.message);
                router.refresh();
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("حدث خطأ غير متوقع أثناء الحذف");
        }
    };

    return (
        <div className="select-none">
            <div
                className={cn(
                    "flex items-center gap-2 py-2 px-2 hover:bg-gray-100 rounded-md cursor-pointer group transition-colors",
                    level > 0 && "ms-6 border-s border-gray-200"
                )}
                onClick={() => hasChildren && setIsOpen(!isOpen)}
            >
                <div className="w-4 h-4 flex items-center justify-center">
                    {hasChildren && (
                        isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400 rtl:rotate-180" />
                    )}
                </div>

                <div className={cn("flex items-center gap-2 flex-1", hasChildren ? "font-medium" : "font-normal")}>
                    {hasChildren ? (
                        isOpen ? <FolderOpen size={16} className="text-yellow-500" /> : <Folder size={16} className="text-yellow-500" />
                    ) : (
                        <FileText size={16} className="text-gray-400" />
                    )}

                    <span className="font-mono text-xs text-gray-500 bg-gray-50 px-1 rounded border">{account.code}</span>
                    <span className="flex-1">{account.name}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full bg-opacity-10 capitalize", typeColors[account.type], `bg-${account.type === 'asset' ? 'blue' : 'gray'}-100`)}>
                        {account.type}
                    </span>
                    <span className="font-mono text-sm font-semibold">{Number(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Add Sub-account">
                        <Plus size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-red-500 hover:bg-red-50" title="Delete" onClick={handleDelete}>
                        <Trash2 size={14} />
                    </Button>
                </div>
            </div>

            {isOpen && hasChildren && (
                <div className="animate-in slide-in-from-top-1 duration-200">
                    {account.children!.map((child) => (
                        <AccountTreeItem key={child.id} account={child} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function AccountTree({ accounts }: { accounts: AccountWithChildren[] }) {
    if (accounts.length === 0) {
        return (
            <div className="text-center py-10 text-gray-500">
                <p>لا توجد حسابات بعد.</p>
                <p className="text-sm">ابدأ بإنشاء دليل الحسابات الخاص بك.</p>
            </div>
        );
    }

    return (
        <div className="border rounded-lg p-4 bg-white min-h-[400px]">
            {accounts.map((account) => (
                <AccountTreeItem key={account.id} account={account} />
            ))}
        </div>
    );
}
