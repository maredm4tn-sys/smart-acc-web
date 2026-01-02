import { getSession } from "@/features/auth/actions";
import { getDashboardStats } from "@/features/dashboard/actions";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage() {
    const session = await getSession();
    if (!session) return null; // Handled by layout, but TS doesn't know
    // Fetch initial data on server (for SEO & Fast First Paint)
    const initialStats = await getDashboardStats();

    return <DashboardView initialData={initialStats} session={session} />;
}
