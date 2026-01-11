"use client";

import { useEffect } from "react";

export function PWARegister() {
    useEffect(() => {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
            window.addEventListener("load", () => {
                navigator.serviceWorker
                    .register("/sw.js")
                    .then((registration) => {
                        console.log("SW registered:", registration.scope);

                        // Pre-fetch main routes for offline use as soon as we're online
                        if (navigator.onLine) {
                            const routes = [
                                '/dashboard',
                                '/dashboard/pos',
                                '/dashboard/inventory',
                                '/dashboard/customers',
                                '/dashboard/suppliers'
                            ];
                            routes.forEach(route => {
                                fetch(route).catch(() => { });
                            });
                        }
                    })
                    .catch((error) => {
                        console.error("SW registration failed:", error);
                    });
            });
        }
    }, []);

    return null;
}
