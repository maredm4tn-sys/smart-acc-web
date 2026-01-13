import { getDictionary } from "@/lib/i18n-server";
import { getSession } from "@/features/auth/actions";
import { RepresentativeReport } from "@/features/representatives/components/representative-report";
import { db } from "@/db";
import { representatives } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function RepresentativeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const dict = await getDictionary();
    const session = await getSession();

    if (!session?.tenantId) return <div>Unauthorized</div>;

    const { id } = await params;
    const repId = parseInt(id);
    if (isNaN(repId)) notFound();

    // Fetch Representative Details
    const rep = await db.query.representatives.findFirst({
        where: and(eq(representatives.id, repId), eq(representatives.tenantId, session.tenantId))
    });

    if (!rep) notFound();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/representatives">
                    <Button variant="ghost" size="icon">
                        <ArrowRight className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <User className="h-6 w-6 text-primary" />
                        {rep.name}
                    </h2>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                        <Badge variant="outline">{rep.type === 'sales' ? (dict as any).Representatives?.Types?.Sales || 'Sales' : (dict as any).Representatives?.Types?.Delivery || 'Delivery'}</Badge>
                        <span>•</span>
                        <span>{rep.phone || ((dict as any).Common?.NA || "N/A")}</span>
                    </div>
                </div>
            </div>

            <RepresentativeReport representativeId={repId} />
        </div>
    );
}
