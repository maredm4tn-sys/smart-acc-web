"use client";

import React, { createContext, useContext } from "react";
import { Dictionary, Locale } from "@/lib/i18n-server";

// We create a context to pass dictionary down to client components WITHOUT making them async
// This is because Client Components cannot be async.

type I18nContextType = {
    dict: Dictionary;
    lang: Locale;
    dir: "rtl" | "ltr";
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({
    children,
    dict,
    lang
}: {
    children: React.ReactNode,
    dict: Dictionary,
    lang: Locale
}) {
    const dir = lang === "ar" ? "rtl" : "ltr";

    return (
        <I18nContext.Provider value={{ dict, lang, dir }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error("useTranslation must be used within an I18nProvider");
    }
    return context;
}
