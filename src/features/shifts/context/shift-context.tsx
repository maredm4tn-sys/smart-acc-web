"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getActiveShift as getActiveShiftAction } from "../actions";

type ShiftContextType = {
    activeShift: any | null;
    isLoading: boolean;
    checkActiveShift: () => Promise<void>;
};

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export function ShiftProvider({ children }: { children: React.ReactNode }) {
    const [activeShift, setActiveShift] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkActiveShift = useCallback(async () => {
        try {
            const shift = await getActiveShiftAction();
            setActiveShift(shift);
        } catch (e) {
            console.error("Failed to load active shift", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkActiveShift();
    }, [checkActiveShift]);

    return (
        <ShiftContext.Provider value={{ activeShift, isLoading, checkActiveShift }}>
            {children}
        </ShiftContext.Provider>
    );
}

export const useShift = () => {
    const context = useContext(ShiftContext);
    if (!context) throw new Error("useShift must be used within a ShiftProvider");
    return context;
};
