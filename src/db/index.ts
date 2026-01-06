import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import * as dotenv from "dotenv";
import path from 'path';
import fs from 'fs';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

dotenv.config();

// Determine App Mode
const mode = process.env.NEXT_PUBLIC_APP_MODE || 'web';

let dbInstance: any;

if (mode === 'desktop') {
    console.log("[DB] Initializing DESKTOP (OFFLINE) Mode with better-sqlite3...");

    const dbPath = process.env.DATABASE_PATH || 'smart-acc-offline.db';
    console.log(`[DB] Storage Path: ${dbPath}`);

    const dir = path.dirname(dbPath);
    try {
        if (!fs.existsSync(dir) && dir !== '.') fs.mkdirSync(dir, { recursive: true });
    } catch (e) { console.error("Could not create DB dir:", e); }

    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');

    dbInstance = drizzle(sqlite, { schema });

    try {
        // Resolve migrations folder.
        let migrationFolder = path.join(process.cwd(), 'drizzle');

        // Development fallback
        if (!fs.existsSync(migrationFolder)) {
            migrationFolder = path.join(process.cwd(), '.next', 'server', 'drizzle');
        }
        if (!fs.existsSync(migrationFolder)) {
            migrationFolder = path.resolve('drizzle');
        }

        console.log(`[DB] Migrations Path: ${migrationFolder}`);

        if (fs.existsSync(migrationFolder)) {
            migrate(dbInstance, { migrationsFolder: migrationFolder });
            console.log("✅ [DB] Migrations applied!");
        } else {
            console.warn("⚠️ [DB] Migrations folder missing. Creating base tables manually?");
        }
    } catch (err) {
        console.error("❌ [DB] Migration failed:", err);
    }

} else if (process.env.POSTGRES_URL) {
    console.log("[DB] Initializing CLOUD (See Vercel) Mode with Postgres...");
    const pool = new pg.Pool({
        connectionString: process.env.POSTGRES_URL,
    });
    dbInstance = drizzlePg(pool, { schema });

    // Auto-Migrate for Vercel
    // Using a self-executing async function to safely run await
    (async () => {
        try {
            console.log("Running PG Migrations...");
            // Vercel puts files in var/task/... so relative path 'drizzle' usually works if included in 'files' or 'assets'
            await migratePg(dbInstance, { migrationsFolder: 'drizzle' });
            console.log("✅ [DB] PG Migrations applied!");
        } catch (e) {
            console.error("❌ [DB] PG Migration failed/skipped:", e);
        }
    })();

} else {
    // Local Web Dev or fallback
    console.log("[DB] Initializing Dev Mode with local SQLite...");
    // Only verify file exists if we are strictly LOCAL dev, on Vercel this might fail if not careful.
    // For now we assume local dev.
    const sqlite = new Database('smart-acc-dev.db');
    dbInstance = drizzle(sqlite, { schema });
}

export const db = dbInstance;
