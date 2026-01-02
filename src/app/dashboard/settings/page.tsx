import { getSettings } from "@/features/settings/actions";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { Toaster } from "@/components/ui/sonner";
import { getDictionary } from "@/lib/i18n-server";

export default async function SettingsPage() {
    const settings = await getSettings();
    const dict = await getDictionary();

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{dict.Settings.Title}</h1>
                <p className="text-muted-foreground">{dict.Settings.Description}</p>
            </div>

            <SettingsForm initialData={settings} />
            <Toaster />
        </div>
    );
}
