"use client";

import { SWRConfig } from "swr";

export const SWRProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <SWRConfig
            value={{
                revalidateOnFocus: false, // Don't refetch when clicking back to window (optional preference)
                shouldRetryOnError: false,
                dedupingInterval: 5000,
            }}
        >
            {children}
        </SWRConfig>
    );
};
