"use client";

import { useState } from "react";
import { AppSidebar } from "./app-sidebar";
import { MobileNav } from "./mobile-nav";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardShellProps {
    children: React.ReactNode;
    user: any;
    dict: any;
    isRtl: boolean;
}

export function DashboardShell({ children, user, dict, isRtl }: DashboardShellProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50/50 flex font-sans relative" dir={isRtl ? "rtl" : "ltr"}>
            {/* Desktop Sidebar / Mobile Overlay Sidebar */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity lg:hidden ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            <div className={`fixed inset-y-0 ${isRtl ? 'right-0' : 'left-0'} z-50 transform lg:relative lg:translate-x-0 transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : isRtl ? "translate-x-full" : "-translate-x-full"}`}>
                <AppSidebar user={user} dict={dict} />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 md:h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu size={24} />
                        </Button>

                        <div className="hidden sm:flex items-center gap-2 text-gray-500 overflow-hidden">
                            <span className="text-xs md:text-sm truncate">{dict.Sidebar.Dashboard}</span>
                            <span className="text-gray-300">/</span>
                            <span className="text-xs md:text-sm font-semibold text-gray-900 truncate">{dict.General.Overview}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* User profile / notifications icon can go here */}
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8">
                    {children}
                </main>
            </div>

            {/* Bottom Mobile Nav */}
            <MobileNav user={user} />
        </div>
    );
}
