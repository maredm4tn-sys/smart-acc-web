const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(command) {
    console.log(`\n>>> Executing: ${command}`);
    try {
        execSync(command, { stdio: 'inherit', env: process.env });
    } catch (error) {
        console.error(`Command failed: ${command}`);
        process.exit(1);
    }
}

console.log("🚀 Starting Smart Accountant Distribution Build...");

// 1. Rebuild better-sqlite3 for the HOST Node.js (so Next.js build works)
console.log("📦 Step 1: Preparing dependencies for Next.js build...");
// Ensure we are using the local node version suitable for the build process
// Reinstall to ensure correct binary without compilation if possible
try {
    const fs = require('fs');
    const bsPath = path.join(__dirname, '..', 'node_modules', 'better-sqlite3');
    if (fs.existsSync(bsPath)) {
        console.log("Removing existing better-sqlite3...");
        fs.rmSync(bsPath, { recursive: true, force: true });
    }
} catch (e) { console.log(e); }

// Force install the host version (Node.js compatible)
run('npm install better-sqlite3 --force');

// 2. Build the Next.js Application
console.log("🏗️  Step 2: Building Next.js App...");
// We explicitly set the environment for desktop mode
process.env.NEXT_PUBLIC_APP_MODE = 'desktop';
run('npx next build --webpack');
run('node scripts/fix-nested-build.js');

// 3. Rebuild better-sqlite3 for Electron (so the final app works)
console.log("🔌 Step 3: Rebuilding dependencies for Electron...");
// We use electron-builder's helper which tries to find prebuilds first, avoiding compilation errors if possible
run('npx electron-builder install-app-deps');
// 3.5. Copy the Rebuilt better-sqlite3 to Standalone
console.log("🔄 Step 3.5: Replacing standalone better-sqlite3 with Electron version...");
try {
    const rootBs = path.join(__dirname, '..', 'node_modules', 'better-sqlite3');
    const standaloneBs = path.join(__dirname, '..', '.next', 'standalone', 'node_modules', 'better-sqlite3');

    if (fs.existsSync(standaloneBs)) {
        console.log("   Removing Node.js version from standalone...");
        fs.rmSync(standaloneBs, { recursive: true, force: true });
    }

    console.log("   Copying Electron version from root...");
    fs.cpSync(rootBs, standaloneBs, { recursive: true });
    console.log("   ✅ Copy success!");
} catch (e) {
    console.error("   ❌ Failed to copy better-sqlite3:", e);
}

// 4. Package the Electron App
console.log("📦 Step 4: Packaging Electron App...");
run('npx electron-builder');

console.log("✅ Build Complete! Check the 'dist' folder.");
