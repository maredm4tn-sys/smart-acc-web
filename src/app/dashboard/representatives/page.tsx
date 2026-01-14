import { getDictionary } from "@/lib/i18n-server";
import { AddRepresentativeDialog } from "@/features/representatives/components/add-representative-dialog";
import { getRepresentatives } from "@/features/representatives/actions";
import { RepresentativesClient } from "@/features/representatives/components/representatives-client";

export default async function RepresentativesPage() {
    const dict = await getDictionary();
    const result = await getRepresentatives(1, 100); // Get first 100 for now, client side pagination or simple list

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">{dict?.Representatives?.Title || "Representatives"}</h2>
                    <p className="text-sm md:text-base text-muted-foreground">{dict?.Representatives?.Description || "Manage representatives"}</p>
                </div>
                <div className="w-full sm:w-auto">
                    <AddRepresentativeDialog />
                </div>
            </div>

            <RepresentativesClient representatives={result.representatives} dict={dict} />
        </div>
    );
}
