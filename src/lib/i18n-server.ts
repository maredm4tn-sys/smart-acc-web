"use server";

import { cookies } from "next/headers";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

const dictionaries = {
    ar,
    en,
};

export type Locale = keyof typeof dictionaries;
export type Dictionary = typeof ar;

export async function getLocale(): Promise<Locale> {
    try {
        const cookieStore = await cookies();
        const lang = cookieStore.get("NEXT_LOCALE")?.value;

        // If we have a stored preference, use it, otherwise DEFAULT TO 'ar'
        if (lang === "en" || lang === "ar") return lang;

        // Final fallback ALWAYS Arabic for the market
        return "ar";
    } catch (e) {
        return "ar";
    }
}

export async function getDictionary(): Promise<Dictionary> {
    const locale = await getLocale();
    return dictionaries[locale];
}
