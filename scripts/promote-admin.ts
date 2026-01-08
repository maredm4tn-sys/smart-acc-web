
import { Database } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';

async function promoteToSuperAdmin() {
    console.log("👑 Promoting admin to SUPER_ADMIN...");

    const dbPath = path.join(process.cwd(), 'smart-acc-offline.db');
    // @ts-ignore
    const sqlite = new (await import('better-sqlite3')).default(dbPath);
    const db = drizzle(sqlite);

    // Update 'admin' user to be SUPER_ADMIN
    const result = await db.update(users)
        .set({ role: 'SUPER_ADMIN' })
        .where(eq(users.username, 'admin'))
        .returning();

    if (result.length > 0) {
        console.log(`✅ Success! User 'admin' is now a SUPER_ADMIN.`);
        console.log("👉 Please refresh the settings page to see the 'Danger Zone'.");
    } else {
        console.log("❌ User 'admin' not found!");
    }
}

promoteToSuperAdmin();
