
import { db } from "@/db";
import { licensing, invoices } from "@/db/schema";
import { sql, count, eq } from "drizzle-orm";
import { execSync } from "child_process";
import * as crypto from "crypto";

export interface LicenseStatus {
    isActivated: boolean;
    isExpired: boolean;
    trialDaysLeft: number;
    invoicesLeft: number;
    totalInvoices: number;
    trialInvoicesLimit: number;
    machineId: string;
}

const TRIAL_DAYS = 14;
const TRIAL_INVOICES = 50;
const SECRET_SALT = "SMART-ACC-OFFLINE-ULTRA-SECURE-2026-X";

function getMachineId(): string {
    try {
        if (process.platform !== 'win32') return "DEV-STATION";

        // 1. Get Motherboard Serial
        const mb = execSync('wmic baseboard get serialnumber').toString().replace('SerialNumber', '').trim();
        // 2. Get CPU ID
        const cpu = execSync('wmic cpu get processorid').toString().replace('ProcessorId', '').trim();

        if (!mb && !cpu) {
            // Fallback to GUID if WMIC fails
            const output = execSync('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid').toString();
            const match = output.match(/[a-f0-9-]{36}/i);
            return match ? match[0].toUpperCase().trim() : "STATION-UNKNOWN";
        }

        // Combine and Hash for a unique, clean HWID
        return crypto.createHash("md5").update(mb + cpu).digest("hex").toUpperCase();
    } catch (e) {
        return "GENERIC-STATION-XP";
    }
}

export function generateLicenseKey(machineId: string): string {
    const cleanId = machineId.toUpperCase().trim();
    // Generate a secure key based on Machine ID + Salt
    const hash = crypto.createHash("sha256").update(cleanId + SECRET_SALT).digest("hex");
    // Format it nicely: XXXX-XXXX-XXXX-XXXX
    return hash.slice(0, 16).toUpperCase().match(/.{4}/g)?.join("-") || "ERR-KEY";
}

export async function getLicenseStatus(): Promise<LicenseStatus> {
    if (process.env.NEXT_PUBLIC_APP_MODE !== 'desktop') {
        return { isActivated: true, isExpired: false, trialDaysLeft: 999, invoicesLeft: 999, totalInvoices: 0, trialInvoicesLimit: 999, machineId: "CLD" };
    }

    // BYPASS FOR TESTING REMOVED FOR PRODUCTION BUILD
    // return { isActivated: true, isExpired: false, trialDaysLeft: 999, invoicesLeft: 999, totalInvoices: 0, trialInvoicesLimit: 999, machineId: "DEV" };

    const machineId = getMachineId();

    try {
        let license = await db.select().from(licensing).limit(1).then(r => r[0]);

        // --- PERSISTENCE LAYER (Registry check to prevent trial reset) ---
        let persistedStartDate: string | null = null;
        try {
            const regQuery = execSync('reg query "HKCU\\Software\\SmartAccountant" /v "InstanceID"', { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
            const match = regQuery.match(/InstanceID\s+REG_SZ\s+(.*)/);
            if (match) persistedStartDate = match[1].trim();
        } catch (e) { /* Keys don't exist yet */ }

        if (!license) {
            // If we found a date in registry, we MUST use it. Otherwise, use now.
            const startDate = persistedStartDate ? new Date(persistedStartDate) : new Date();

            // If it wasn't in registry, save it now so we remember this machine forever
            if (!persistedStartDate) {
                try {
                    execSync(`reg add "HKCU\\Software\\SmartAccountant" /v "InstanceID" /t REG_SZ /d "${startDate.toISOString()}" /f`);
                } catch (e) { console.error("Registry write failed"); }
            }

            await db.insert(licensing).values({
                isActivated: false,
                trialStartDate: startDate,
                machineId: machineId
            });
            license = await db.select().from(licensing).limit(1).then(r => r[0]);
        } else if (!persistedStartDate && license.trialStartDate) {
            // If it's in DB but not Registry (e.g. system cleanup), back it up to Registry
            try {
                execSync(`reg add "HKCU\\Software\\SmartAccountant" /v "InstanceID" /t REG_SZ /d "${new Date(license.trialStartDate).toISOString()}" /f`);
            } catch (e) { }
        }
        // --- END PERSISTENCE ---

        // Auto-fix machine ID if it's empty in DB
        if (!license || !license.machineId) {
            await db.update(licensing).set({ machineId: machineId });
        }

        if (license.isActivated) {
            return { isActivated: true, isExpired: false, trialDaysLeft: 999, invoicesLeft: 999, totalInvoices: 0, trialInvoicesLimit: 50, machineId };
        }

        const now = new Date();
        const start = new Date(license.trialStartDate!);

        // --- ANTI-BACKDATING CHECK ---
        if (license.lastUsedDate && now < new Date(license.lastUsedDate)) {
            console.error("⏱️ [SECURITY] Clock manipulation detected!");
            return {
                isActivated: false,
                isExpired: true,
                trialDaysLeft: 0,
                invoicesLeft: 0,
                totalInvoices: 0,
                trialInvoicesLimit: TRIAL_INVOICES,
                machineId
            };
        }

        // Update Last Used Date synchronously for next time
        await db.update(licensing).set({ lastUsedDate: now }).where(eq(licensing.id, license.id));
        // --- END ANTI-BACKDATING ---

        const diffTime = Math.abs(now.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(0, TRIAL_DAYS - diffDays);

        const invoiceCountResult = await db.select({ val: count() }).from(invoices);
        const totalInv = invoiceCountResult[0]?.val || 0;
        const invLeft = Math.max(0, TRIAL_INVOICES - totalInv);

        const isExpired = daysLeft <= 0 || invLeft <= 0;

        return {
            isActivated: false,
            isExpired,
            trialDaysLeft: daysLeft,
            invoicesLeft: invLeft,
            totalInvoices: totalInv,
            trialInvoicesLimit: TRIAL_INVOICES,
            machineId
        };
    } catch (e) {
        return { isActivated: false, isExpired: true, trialDaysLeft: 0, invoicesLeft: 0, totalInvoices: 0, trialInvoicesLimit: 50, machineId: "ERR" };
    }
}
