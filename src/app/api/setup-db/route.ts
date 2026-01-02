import { db } from "@/db";
import { users, tenants } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
    try {
        console.log("Starting DB Setup via API...");

        // 1. Add username column
        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN username text;`);
        } catch (e) {
            console.log("username column update note:", e);
        }

        // 2. Make email optional
        try {
            await db.execute(sql`ALTER TABLE users ALTER COLUMN email DROP NOT NULL;`);
        } catch (e) {
            console.log("email column update note:", e);
        }

        // 3. Backfill username
        try {
            // Use split_part or just copy email if split_part failed
            await db.execute(sql`UPDATE users SET username = email WHERE username IS NULL;`);
        } catch (e) {
            console.log("backfill note:", e);
        }

        // 4. Update existing roles to be compliant (simplest way: set everyone to 'cashier' except admin usually, but let's just force valid values)
        try {
            await db.execute(sql`UPDATE users SET role = 'cashier' WHERE role NOT IN ('admin', 'cashier');`);
        } catch (e) {
            console.log("role update note:", e);
        }

        // 5. Seed Admin
        const passwordHash = await bcrypt.hash("admin123", 10);

        // We can't use dizzie's `users.username` in query if the schema isn't synced in runtime type, 
        // but here we imported the updated schema, so it should work if DB has column.
        // However, if the column add failed above, this will throw.

        // Find tenant
        const [tenant] = await db.select().from(tenants).limit(1);

        if (tenant) {
            // Check admin
            // We use raw SQL to avoid type/schema mismatch issues during this transitional phase if needed,
            // but let's try ORM first.
            const existingAdmin = await db.select().from(users).where(eq(users.username, 'admin'));
            if (existingAdmin.length === 0) {
                await db.insert(users).values({
                    tenantId: tenant.id,
                    username: "admin",
                    fullName: "System Admin",
                    email: "admin@smartacc.com",
                    passwordHash: passwordHash,
                    role: "admin",
                    isActive: true
                });
            }

            // Check cashier
            const cashierPass = await bcrypt.hash("123456", 10);
            const existingCashier = await db.select().from(users).where(eq(users.username, 'cashier'));
            if (existingCashier.length === 0) {
                await db.insert(users).values({
                    tenantId: tenant.id,
                    username: "cashier",
                    fullName: "Main Cashier",
                    email: "cashier@smartacc.com",
                    passwordHash: cashierPass,
                    role: "cashier",
                    isActive: true
                });
            }
        }

        return NextResponse.json({ success: true, message: "Migration completed" });
    } catch (e: any) {
        console.error("Migration API Error:", e);
        return NextResponse.json({ success: false, error: e.message || String(e) }, { status: 500 });
    }
}
