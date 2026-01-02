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
        return (lang === "en" || lang === "ar") ? lang : "ar";
    } catch (e) {
        return "ar"; // Fallback for scripts/tests
    }
}

export async function getDictionary(): Promise<Dictionary> {
    const locale = await getLocale();
    return dictionaries[locale];
}
