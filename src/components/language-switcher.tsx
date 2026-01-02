"use client";

import { useTranslation } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";

export function LanguageSwitcher() {
    const { lang } = useTranslation();
    const router = useRouter();

    const toggleLanguage = () => {
        const newLang = lang === "ar" ? "en" : "ar";
        // Set cookie
        document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
        // Refresh page to re-render server components with new lang
        router.refresh();
    };

    return (
        <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-2 font-mono">
            <Languages size={16} />
            {lang === "ar" ? "English" : "عربي"}
        </Button>
    )
}
