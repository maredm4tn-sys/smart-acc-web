"use client";

import { AlertTriangle, Monitor, Globe } from "lucide-react";
import { useEffect, useState } from "react";

export function EnvBanner() {
    const [isLocal, setIsLocal] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        // Detect localhost
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
            setIsLocal(true);
        }
        // Detect Desktop Mode from process.env (passed via next config)
        if (process.env.NEXT_PUBLIC_APP_MODE === 'desktop') {
            setIsDesktop(true);
        }
    }, []);

    if (!isLocal && !isDesktop) return null;

    return (
        <div className="bg-amber-500 text-white py-1.5 px-4 flex items-center justify-center gap-4 text-sm font-bold shadow-md sticky top-0 z-[9999] border-b border-amber-600/20">
            <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="animate-pulse" />
                <span className="uppercase tracking-wider">
                    {isDesktop ? "النسخة المحلية - وضع الأوفلاين (Desktop)" : "بيئة تجريبية محلية (Localhost)"}
                </span>
            </div>
            <div className="flex items-center gap-4 opacity-90 border-l border-white/20 pl-4 h-4 ml-4">
                <div className="flex items-center gap-1">
                    <Monitor size={14} />
                    <span>للتجارب فقط</span>
                </div>
                <div className="hidden sm:flex items-center gap-1">
                    <Globe size={14} />
                    <span>لا ترفع أي بيانات حساسة هنا</span>
                </div>
            </div>
            <button
                onClick={(e) => (e.currentTarget.parentElement!.style.display = 'none')}
                className="ml-auto text-white/60 hover:text-white transition-colors"
                title="إخفاء"
            >
                ✕
            </button>
        </div>
    );
}
