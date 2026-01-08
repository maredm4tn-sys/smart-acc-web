
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
const SECRET_SALT = "MARED2026"; // Simplified salt to avoid any formatting issues

function getMachineId(): string {
    try {
        if (process.platform !== 'win32') return "DEV-STATION";
        // Get Machine GUID from Windows Registry and CLEAN IT
        const output = execSync('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid').toString();
        const match = output.match(/[a-f0-9-]{36}/i);
        return match ? match[0].toUpperCase().trim() : "UNKNOWN-HW-ID";
    } catch (e) {
        return "GENERIC-STATION-01";
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

    const machineId = getMachineId();

    try {
        let license = await db.select().from(licensing).limit(1).then(r => r[0]);

        if (!license) {
            await db.insert(licensing).values({
                isActivated: false,
                trialStartDate: new Date(),
                machineId: machineId
            });
            license = await db.select().from(licensing).limit(1).then(r => r[0]);
        }

        // Auto-fix machine ID if it's empty in DB
        if (!license.machineId) {
            await db.update(licensing).set({ machineId: machineId });
        }

        if (license.isActivated) {
            return { isActivated: true, isExpired: false, trialDaysLeft: 999, invoicesLeft: 999, totalInvoices: 0, trialInvoicesLimit: 50, machineId };
        }

        const now = new Date();
        const start = new Date(license.trialStartDate!);
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
