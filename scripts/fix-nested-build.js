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

        // Remove destination if it exists (e.g. from previous run) to avoid collisions
        if (fs.existsSync(destPath)) {
            fs.rmSync(destPath, { recursive: true, force: true });
        }

        fs.renameSync(srcPath, destPath);
    });

    // Clean up empty directories
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
