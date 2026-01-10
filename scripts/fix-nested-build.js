const fs = require('fs');
const path = require('path');

const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');
const nestedDir = path.join(standaloneDir, '.gemini', 'antigravity', 'scratch', 'smart-acc-web');

if (fs.existsSync(nestedDir)) {
    console.log('Detected nested build structure. Flattening...');

    const items = fs.readdirSync(nestedDir);
    items.forEach(item => {
        const srcPath = path.join(nestedDir, item);
        const destPath = path.join(standaloneDir, item);

        console.log(`Moving ${item} to ${destPath}`);

        if (fs.existsSync(destPath)) {
            fs.rmSync(destPath, { recursive: true, force: true });
        }

        fs.renameSync(srcPath, destPath);
    });

    console.log('Cleaning up nested directories...');
    try {
        fs.rmSync(path.join(standaloneDir, '.gemini'), { recursive: true, force: true });
    } catch (e) {
        console.warn('Failed to clean up .gemini dir:', e);
    }
    console.log('Fixed standalone build structure.');
} else {
    console.log('Nested build structure not found. Skipping fix.');
}

// --- NEW: Fix Missing Native Binaries in Standalone ---
console.log('Ensuring native binaries are included in standalone...');

const nativeModules = ['better-sqlite3']; // Add others if needed like 'sharp'

nativeModules.forEach(mod => {
    const srcModPath = path.join(__dirname, '..', 'node_modules', mod, 'build');
    const destModPath = path.join(standaloneDir, 'node_modules', mod, 'build');

    if (fs.existsSync(srcModPath)) {
        console.log(`Copying ${mod} build folder to standalone...`);
        if (fs.existsSync(destModPath)) {
            fs.rmSync(destModPath, { recursive: true, force: true });
        }
        // Use a simple recursive copy (since we might not have a helper)
        function copyFolderSync(from, to) {
            if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
            fs.readdirSync(from).forEach(element => {
                if (fs.lstatSync(path.join(from, element)).isDirectory()) {
                    copyFolderSync(path.join(from, element), path.join(to, element));
                } else {
                    fs.copyFileSync(path.join(from, element), path.join(to, element));
                }
            });
        }
        copyFolderSync(srcModPath, destModPath);
        console.log(`Successfully copied ${mod} build.`);
    } else {
        console.warn(`Warning: Could not find build folder for ${mod} at ${srcModPath}`);
    }
});

