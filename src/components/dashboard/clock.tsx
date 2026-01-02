"use client";

import { useEffect, useState } from "react";
import { Clock as ClockIcon } from "lucide-react";

export function Clock() {
    const [time, setTime] = useState("");

    useEffect(() => {
        // Initial set
        setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

        const interval = setInterval(() => {
            setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    if (!time) return null; // Avoid hydration mismatch

    return (
        <div className="flex items-center gap-2 text-sm font-bold text-gray-600 mt-1">
            <ClockIcon className="h-4 w-4" />
            <span className="font-mono dir-ltr tracking-widest">{time}</span>
        </div>
    );
}
