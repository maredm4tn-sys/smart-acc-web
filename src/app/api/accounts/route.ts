
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { accounts } from '@/db/schema';
import { getSession } from '@/features/auth/actions';
import { getActiveTenantId } from '@/lib/actions-utils';
import { eq, and, like, or, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getSession();
    const tenantId = session?.tenantId || await getActiveTenantId();
    if (!tenantId) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type'); // example: 'asset,liability,equity,revenue,expense'
    const search = searchParams.get('search');

    const filters = [eq(accounts.tenantId, tenantId)];

    if (typeParam) {
        // Support comma-separated types for broader expansion (2000-5000 range and more)
        const types = typeParam.split(',').map(t => t.trim());
        console.log(`[API] Fetching accounts for types: ${types.join(', ')}`);
        filters.push(inArray(accounts.type, types as any[]));
    }

    if (search) {
        filters.push(
            or(
                like(accounts.name, `%${search}%`),
                like(accounts.code, `%${search}%`)
            )
        );
    }

    try {
        const data = await db.select({
            id: accounts.id,
            name: accounts.name,
            code: accounts.code,
            type: accounts.type
        })
            .from(accounts)
            .where(and(...filters))
            .limit(50); // Limit results for performance

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
