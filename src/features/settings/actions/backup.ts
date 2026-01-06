'use server';

import { db } from "@/db";
import { sql } from "drizzle-orm";
import fs from 'fs';

export async function createFullBackup(destinationPath: string) {
    try {
        console.log(`[Backup] Starting VACUUM INTO '${destinationPath}'...`);

        // VACUUM INTO requires the target file to NOT exist.
        if (fs.existsSync(destinationPath)) {
            fs.unlinkSync(destinationPath);
        }

        // Execute raw SQLite command for safe backup
        await db.run(sql`VACUUM INTO ${sql.raw(`'${destinationPath}'`)}`);

        console.log("[Backup] Success!");
        return { success: true };
    } catch (error: any) {
        console.error("[Backup] Failed:", error);
        return { success: false, error: error.message };
    }
}
