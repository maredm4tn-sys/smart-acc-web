
import { NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getSession } from "@/features/auth/actions";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getSession();
        const tenantId = session?.tenantId;

        // Allow public access or validate session?
        // POS usually requires login.
        if (!tenantId) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const data = await db.select().from(products).where(eq(products.tenantId, tenantId));

        return NextResponse.json({ success: true, data });
    } catch (e) {
        return NextResponse.json({ success: false, message: "Failed to fetch products" });
    }
}
