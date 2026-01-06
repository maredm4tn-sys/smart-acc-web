const { createHash } = require("crypto");
const readline = require('readline');

const LICENSE_SALT = "MARED-SMART-ACC-2026-SECRET-SALT-V1";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("=== Smart Accountant Key Generator ===");

rl.question("Enter Machine ID: ", (machineId) => {
    if (!machineId) {
        console.log("Machine ID is required!");
        rl.close();
        return;
    }

    const key = createHash('sha256')
        .update(machineId.trim() + LICENSE_SALT)
        .digest('hex')
        .substring(0, 16)
        .toUpperCase();

    console.log("\n=================================");
    console.log("ACTIVATION KEY:");
    console.log(key);
    console.log("=================================\n");
    console.log("Copy this key and paste it into the application.");

    rl.close();
});
