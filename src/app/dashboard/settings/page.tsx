import { getSettings } from "@/features/settings/actions";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { Toaster } from "@/components/ui/sonner";
import { getDictionary } from "@/lib/i18n-server";
import { getSession } from "@/features/auth/actions";
import { getAllUsers } from "@/features/admin/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserList } from "@/features/admin/components/user-list";
import { DangerZone } from "@/features/admin/components/danger-zone";

export default async function SettingsPage() {
    const settings = await getSettings();
    const dict = await getDictionary();
    const session = await getSession();

    const isSuperAdmin = session?.role === "SUPER_ADMIN";
    const users = isSuperAdmin ? await getAllUsers() : [];

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{dict.Settings.Title}</h1>
                <p className="text-muted-foreground">{dict.Settings.Description}</p>
            </div>

            <Tabs defaultValue="facility" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="facility">إعدادات المنشأة</TabsTrigger>
                    {isSuperAdmin && (
                        <>
                            <TabsTrigger value="subscribers">إدارة المشتركين</TabsTrigger>
                            <TabsTrigger value="danger">منطقة الخطر</TabsTrigger>
                        </>
                    )}
                </TabsList>
                <TabsContent value="facility" className="space-y-4">
                    <SettingsForm initialData={settings} />
                </TabsContent>
                {isSuperAdmin && (
                    <>
                        <TabsContent value="subscribers" className="space-y-4">
                            <UserList users={users} />
                        </TabsContent>
                        <TabsContent value="danger" className="space-y-4">
                            <DangerZone />
                        </TabsContent>
                    </>
                )}
            </Tabs>

            <Toaster />
        </div>
    );
}
