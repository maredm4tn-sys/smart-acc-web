import { db } from "@/db";
import { users, tenants, invoices, products } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { SubscriberControlPanel } from "@/features/admin/components/subscriber-control-panel";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getLocale, getDictionary } from "@/lib/i18n-server";

export default async function SubscriberDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const lang = await getLocale();
    const dict = await getDictionary();
    const isRtl = lang === 'ar';

    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) {
        return <div>User not found</div>;
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId));

    // Fetch Stats
    const [invoiceCount] = await db.select({ count: count() }).from(invoices).where(eq(invoices.tenantId, tenant.id));
    const [productCount] = await db.select({ count: count() }).from(products).where(eq(products.tenantId, tenant.id));

    return (
        <div className="space-y-6 container mx-auto py-6">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/dashboard/settings">
                    <Button variant="ghost" size="icon">
                        {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">{dict.SubscriberManagement.ControlPanel.Title}</h1>
                    <p className="text-muted-foreground">{tenant.name}</p>
                </div>
            </div>

            <SubscriberControlPanel
                tenant={tenant}
                user={user}
                stats={{
                    invoiceCount: invoiceCount.count,
                    productCount: productCount.count
                }}
                dict={dict}
                lang={lang}
            />
        </div>
    );
}
