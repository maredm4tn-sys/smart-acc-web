import { db } from "../src/db";
import { users, tenants } from "../src/db/schema";
import { sql, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
    console.log("Starting migration...");

    try {
        // 1. Add username column if it doesn't exist
        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN username text;`);
            console.log("Added username column.");
        } catch (e) {
            console.log("username column might already exist or error:", e);
        }

        // 2. Make email optional (DROP NOT NULL)
        try {
            await db.execute(sql`ALTER TABLE users ALTER COLUMN email DROP NOT NULL;`);
            console.log("Made email optional.");
        } catch (e) {
            console.log("Could not alter email column:", e);
        }

        // 3. Update existing users to have a username (fallback to email or part of it)
        try {
            await db.execute(sql`UPDATE users SET username = split_part(email, '@', 1) WHERE username IS NULL;`);
            console.log("Backfilled usernames.");
        } catch (e) {
            console.log("Error backfilling usernames:", e);
        }

        // 4. Update Role Constraint (Drop old check, add new one)
        // Note: constraint names are often auto-generated. We might just skip this if Drizzle app handles it, 
        // but for safety let's try to update roles that don't match.
        await db.execute(sql`UPDATE users SET role = 'cashier' WHERE role NOT IN ('admin', 'cashier');`);
        console.log("Normalized text roles.");

        // 5. Seed Admin User
        const passwordHash = await bcrypt.hash("admin123", 10);

        // Check if admin exists
        const existingAdmin = await db.select().from(users).where(eq(users.username, 'admin'));

        if (existingAdmin.length === 0) {
            // Get a tenant id
            const [tenant] = await db.select().from(tenants).limit(1);
            if (tenant) {
                await db.insert(users).values({
                    tenantId: tenant.id,
                    username: "admin",
                    fullName: "System Admin",
                    email: "admin@smartacc.com",
                    passwordHash: passwordHash,
                    role: "admin",
                    isActive: true
                });
                console.log("Created admin user.");
            } else {
                console.log("No tenant found. Cannot create admin.");
            }
        } else {
            console.log("Admin user already exists.");
        }

        // 6. Seed Cashier User
        const cashierPass = await bcrypt.hash("123456", 10);
        const existingCashier = await db.select().from(users).where(eq(users.username, 'cashier'));
        if (existingCashier.length === 0) {
            const [tenant] = await db.select().from(tenants).limit(1);
            if (tenant) {
                await db.insert(users).values({
                    tenantId: tenant.id,
                    username: "cashier",
                    fullName: "Main Cashier",
                    email: "cashier@smartacc.com",
                    passwordHash: cashierPass,
                    role: "cashier",
                    isActive: true
                });
                console.log("Created cashier user.");
            }
        }

    } catch (e) {
        console.error("Migration/Seeding failed:", e);
    }

    console.log("Done.");
}

main();
