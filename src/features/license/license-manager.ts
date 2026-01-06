"use client";

import { createHash } from "crypto";

// This secret salt makes it harder to reverse-engineer key generation
// changing this invalidates all previous keys!
const LICENSE_SALT = "MARED-SMART-ACC-2026-SECRET-SALT-V1";

export class LicenseManager {
    static async getMachineId(): Promise<string> {
        if (typeof window !== 'undefined' && (window as any).electron) {
            return await (window as any).electron.getMachineId();
        }
        // Fallback for Web Mode (Not strictly needed but prevents crashes)
        return "WEB-BROWSER-ID";
    }

    static generateExpectedKey(machineId: string): string {
        // Algorithm: SHA256(MachineID + SALT) -> Take first 16 chars -> Uppercase
        // This is the "Correct" key for this machine.
        const hash = createHash('sha256')
            .update(machineId + LICENSE_SALT)
            .digest('hex');

        return hash.substring(0, 16).toUpperCase();
    }

    static async validateLicense(inputKey: string): Promise<boolean> {
        const machineId = await this.getMachineId();
        const expectedKey = this.generateExpectedKey(machineId);
        return inputKey === expectedKey;
    }

    static saveLicense(key: string) {
        if (typeof window !== 'undefined') {
            localStorage.setItem('smart_acc_license_key', key);
        }
    }

    static getSavedLicense(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('smart_acc_license_key');
        }
        return null;
    }
}
