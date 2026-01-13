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
console.log(`🔍 [DB DEBUG] Mode: ${mode}, NEXT_PUBLIC_APP_MODE: ${process.env.NEXT_PUBLIC_APP_MODE}`);

let _dbInstance: any;

function initDb() {
    if (_dbInstance) return _dbInstance;

    try {
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

            _dbInstance = drizzle(sqlite, { schema });

            try {
                let migrationFolder = path.join(process.cwd(), 'drizzle', 'sqlite');
                if (!fs.existsSync(migrationFolder)) {
                    migrationFolder = path.join(process.cwd(), '.next', 'server', 'drizzle', 'sqlite');
                }
                if (!fs.existsSync(migrationFolder)) {
                    migrationFolder = path.resolve('drizzle', 'sqlite');
                }
                console.log(`[DB] Migrations Path: ${migrationFolder}`);

                if (fs.existsSync(migrationFolder)) {
                    // migrate(_dbInstance, { migrationsFolder: migrationFolder });
                    console.log("✅ [DB] Migrations SKIPPED (Manual Patch Mode)!");
                }
            } catch (err) {
                console.error("❌ [DB] Migration failed:", err);
            }
        } else if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
            console.log("[DB] Initializing CLOUD Mode with Postgres...");
            const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
            const pool = new pg.Pool({ connectionString });
            _dbInstance = drizzlePg(pool, { schema });

            (async () => {
                try {
                    const paths = [
                        path.join(process.cwd(), 'drizzle', 'pg'),
                        path.join(process.cwd(), '.next', 'server', 'drizzle', 'pg'),
                        path.join(__dirname, '..', '..', 'drizzle', 'pg'),
                        path.join('/var/task', 'drizzle', 'pg')
                    ];
                    let migrationFolder = paths[0];
                    for (const p of paths) {
                        if (fs.existsSync(p)) { migrationFolder = p; break; }
                    }
                    await migratePg(_dbInstance, { migrationsFolder: migrationFolder });
                } catch (e: any) { }
            })();
        } else {
            console.log("[DB] Initializing Dev Mode with local SQLite...");
            const sqlite = new Database('smart-acc-dev.db');
            sqlite.pragma('journal_mode = WAL');
            _dbInstance = drizzle(sqlite, { schema });
        }
    } catch (e: any) {
        console.error("CRITICAL: DB initialization failed:", e);
        // Return a dummy object to prevent immediate crash during build extraction
        return {} as any;
    }

    return _dbInstance;
}

// Export a proxy that initializes the DB on first access
export const db = new Proxy({} as any, {
    get: (target, prop) => {
        const instance = initDb();
        return instance[prop];
    },
    apply: (target, thisArg, argumentsList) => {
        const instance = initDb();
        return Reflect.apply(instance, thisArg, argumentsList);
    }
});

