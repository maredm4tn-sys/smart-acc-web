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

    return null; // Banner removed for professional look in production version
}
