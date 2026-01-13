"use server";

import { cookies } from "next/headers";
// Dictionaries are loaded dynamically to avoid bundle issues

const dictionaries = {
    ar: () => import("@/messages/ar.json").then((module) => module.default),
    en: () => import("@/messages/en.json").then((module) => module.default),
};

export type Locale = keyof typeof dictionaries;
// Use the Arabic dictionary as the source of truth for the type
import ar_type from "@/messages/ar.json";
export type Dictionary = typeof ar_type;

export async function getLocale(): Promise<Locale> {
    try {
        const cookieStore = await cookies();
        const lang = cookieStore.get("NEXT_LOCALE")?.value;
        if (lang === "en" || lang === "ar") return lang as Locale;
        return "ar";
    } catch (e) {
        return "ar";
    }
}

export async function getDictionary(): Promise<Dictionary> {
    const locale = await getLocale();
    return await dictionaries[locale]();
}
