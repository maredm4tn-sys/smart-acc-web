
import { NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { getSession } from "@/features/auth/actions";
import { eq } from "drizzle-orm";

export async function GET() {
    try {
        const session = await getSession();
        const tenantId = session?.tenantId;
        if (!tenantId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

        const data = await db.select({
            id: customers.id,
            name: customers.name
        })
            .from(customers)
            .where(eq(customers.tenantId, tenantId));

        return NextResponse.json({ success: true, data });
    } catch (e) {
        return NextResponse.json({ success: false, data: [] });
    }
}
