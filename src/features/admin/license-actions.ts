
"use server";
import { getLicenseStatus as check, generateLicenseKey } from "@/lib/license-check";
import { db } from "@/db";
import { licensing } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function getLicenseAction() {
    return await check();
}

export async function activateLicense(key: string) {
    const status = await check();

    // Validate the key against the machine ID
    const expectedKey = generateLicenseKey(status.machineId);

    if (key === expectedKey) {
        await db.update(licensing).set({
            isActivated: true,
            activationKey: key,
            updatedAt: new Date(),
            machineId: status.machineId
        });
        revalidatePath("/");
        return { success: true };
    }

    return { success: false, error: "كود التفعيل غير صالح لهذا الجهاز" };
}
