"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
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
    const pathname = usePathname();
    const isPosPage = pathname === "/dashboard/pos";
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Detect Fullscreen state
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const handleResize = () => {
                // Relying ONLY on actual Fullscreen API state to avoid Chrome's height calculation issues
                const isFs = !!document.fullscreenElement;
                setIsFullscreen(isFs);
            };
            handleResize();
            window.addEventListener('resize', handleResize);
            window.addEventListener('fullscreenchange', handleResize);
            window.addEventListener('webkitfullscreenchange', handleResize);
            window.addEventListener('mozfullscreenchange', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                window.removeEventListener('fullscreenchange', handleResize);
                window.removeEventListener('webkitfullscreenchange', handleResize);
                window.removeEventListener('mozfullscreenchange', handleResize);
            };
        }
    }, []);

    const shouldHideSidebar = isPosPage && isFullscreen;

    return (
        <div className="min-h-screen bg-gray-50/50 flex font-sans relative" dir={isRtl ? "rtl" : "ltr"}>
            {/* Desktop Sidebar / Mobile Overlay Sidebar */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${!shouldHideSidebar ? 'lg:hidden' : ''} ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            <div className={`fixed inset-y-0 ${isRtl ? 'right-0' : 'left-0'} z-50 transform ${!shouldHideSidebar ? 'lg:relative lg:translate-x-0' : ''} transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : isRtl ? "translate-x-full" : "-translate-x-full"}`}>
                <AppSidebar user={user} dict={dict} onClose={() => setIsSidebarOpen(false)} />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {!shouldHideSidebar && (
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
                                <span className="text-xs md:text-sm truncate">{dict?.Sidebar?.Dashboard || "Dashboard"}</span>
                                <span className="text-gray-300">/</span>
                                <span className="text-xs md:text-sm font-semibold text-gray-900 truncate">{dict?.General?.Overview || "Overview"}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* User profile / notifications icon can go here */}
                        </div>
                    </header>
                )}

                <main className={`flex-1 overflow-auto ${isPosPage ? 'p-1' : 'p-4 md:p-8 pb-24 md:pb-8'} relative`}>
                    {children}
                </main>
            </div>

            {/* Bottom Mobile Nav */}
            <MobileNav user={user} />
        </div>
    );
}
