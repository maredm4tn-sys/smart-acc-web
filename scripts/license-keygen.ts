
const { createHash } = require("crypto");

// MUST MATCH THE SALT IN src/features/license/license-manager.ts
const LICENSE_SALT = "MARED-SMART-ACC-2026-SECRET-SALT-V1";

// Get Machine ID from arguments
const machineId = process.argv[2];

if (!machineId) {
    console.error("\n❌ Error: Please provide a Machine ID.");
    console.log("Usage: npx ts-node scripts/license-keygen.ts <MACHINE_ID>\n");
    process.exit(1);
}

// Generate the Key
const key = createHash('sha256')
    .update(machineId + LICENSE_SALT)
    .digest('hex')
    .substring(0, 16)
    .toUpperCase();

console.log("\n=================================");
console.log("🔐 SMART ACCOUNTANT KEY GENERATOR");
console.log("=================================");
console.log(`Machine ID:  ${machineId}`);
console.log(`LICENSE KEY: ${key}`);
console.log("=================================\n");
