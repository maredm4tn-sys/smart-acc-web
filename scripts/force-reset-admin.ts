
import { Database } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import path from 'path';

async function forceResetPassword() {
    console.log("🔒 Forcing Admin Password Reset...");

    const dbPath = path.join(process.cwd(), 'smart-acc-offline.db');
    // @ts-ignore
    const sqlite = new (await import('better-sqlite3')).default(dbPath);
    const db = drizzle(sqlite);

    const newPassword = "admin";
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update ANY user with username 'admin'
    const result = await db.update(users)
        .set({ passwordHash: hashedPassword })
        .where(eq(users.username, 'admin'))
        .returning();

    if (result.length > 0) {
        console.log(`✅ Success! Password for user 'admin' has been reset to '${newPassword}'`);
    } else {
        console.log("❌ User 'admin' not found! Please check the database seeding.");
    }
}

forceResetPassword();
