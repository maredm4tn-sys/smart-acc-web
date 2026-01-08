
const crypto = require("crypto");

const SECRET_SALT = "MARED2026"; // الملح الجديد المبسط

function generateLicenseKey(machineId) {
    if (!machineId) {
        console.error("❌ خطأ: يرجى إدخال رقم الجهاز (Machine ID)");
        return;
    }

    // تنظيف المعرف تماماً من أي مسافات أو حروف صغيرة
    const cleanId = machineId.toUpperCase().trim();

    const hash = crypto.createHash("sha256").update(cleanId + SECRET_SALT).digest("hex");
    const key = hash.slice(0, 16).toUpperCase().match(/.{4}/g).join("-");

    console.log("\n========================================");
    console.log("💎 كود التفعيل للنسخة رقم (10):");
    console.log("----------------------------------------");
    console.log(`🆔 رقم الجهاز: ${cleanId}`);
    console.log(`🔑 كود التفعيل: ${key}`);
    console.log("========================================\n");
}

const args = process.argv.slice(2);
generateLicenseKey(args[0]);
