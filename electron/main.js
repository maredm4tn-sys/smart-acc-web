const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn, execSync, exec } = require('child_process');
const http = require('http');
const fs = require('fs');

let mainWindow;
let serverProcess;
const PORT = 3002;
const DB_FILENAME = 'smart-acc-offline.db'; // Unified constant for DB filename

// --- 0. Startup Restore Check (CRITICAL) ---
function performPendingRestore() {
    try {
        const userDataPath = app.getPath('userData');
        const dbPath = path.join(userDataPath, DB_FILENAME);
        const pendingPath = path.join(userDataPath, 'pending_restore.db');

        if (fs.existsSync(pendingPath)) {
            console.log("Found pending restore. Applying update...");

            try {
                if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
                if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
            } catch (e) {
                console.error("Warning: Could not clear WAL files", e);
            }

            try {
                fs.copyFileSync(pendingPath, dbPath);
            } catch (copyErr) {
                console.error("First copy attempt failed, retrying in 1s...", copyErr);
                const start = Date.now();
                while (Date.now() - start < 1000) { }
                fs.copyFileSync(pendingPath, dbPath);
            }

            fs.unlinkSync(pendingPath);
            console.log("Restore completed successfully.");
        }
    } catch (e) {
        console.error("CRITICAL: Failed to apply restore at startup:", e);
    }
}

performPendingRestore();


// --- Single Instance Lock ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    console.log("Another instance is already running. Quitting...");
    app.quit();
    return;
}

app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

function killProcessTree(pid) {
    if (!pid) return;
    try {
        if (process.platform === 'win32') {
            execSync(`taskkill /pid ${pid} /f /t`);
        } else {
            process.kill(pid, 'SIGKILL');
        }
    } catch (e) {
    }
}

function checkAndKillPort(port) {
    if (process.platform !== 'win32') return;
    try {
        console.log(`Checking port ${port}...`);
        const findCmd = `netstat -ano | findstr :${port}`;
        const output = execSync(findCmd, { encoding: 'utf8', stdio: 'pipe' });
        const lines = output.trim().split('\n');
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && /^\d+$/.test(pid) && pid !== '0') {
                console.log(`Port ${port} is busy. Killing PID ${pid}...`);
                execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
            }
        }
    } catch (e) {
        if (e.status !== 1) console.error(`Error cleaning port ${port}:`, e.message);
    }
}

function startServer() {
    if (!app.isPackaged) return;

    const userDataPath = app.getPath('userData');
    const logPath = path.join(userDataPath, 'server.log');
    const logFd = fs.openSync(logPath, 'a');

    checkAndKillPort(PORT);

    const serverPath = path.join(process.resourcesPath, 'app-server', 'server.js');
    const dbPath = path.join(userDataPath, DB_FILENAME);

    console.log("Starting Next.js Server from:", serverPath);

    serverProcess = spawn(process.execPath, [serverPath], {
        cwd: path.dirname(serverPath),
        env: {
            ...process.env,
            PORT: PORT.toString(),
            HOST: '127.0.0.1',
            NEXT_PUBLIC_APP_MODE: 'desktop',
            DATABASE_PATH: dbPath,
            NODE_ENV: 'production',
            ELECTRON_RUN_AS_NODE: '1'
        },
        stdio: ['ignore', logFd, logFd],
        windowsHide: true,
        detached: false
    });

    serverProcess.on('error', (err) => console.error('Failed to start server:', err));
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "Smart Accountant - Offline",
        icon: path.join(__dirname, '../public/logo.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true,
    });

    const startUrl = `http://localhost:${PORT}`;

    const loadPage = () => {
        if (!app.isPackaged) {
            mainWindow.loadURL('http://localhost:3002');
            return;
        }

        const request = http.get(startUrl, (res) => {
            if (res.statusCode === 200) {
                mainWindow.loadURL(startUrl);
            } else {
                setTimeout(loadPage, 1000);
            }
        });

        request.on('error', () => {
            setTimeout(loadPage, 1000);
        });
        request.end();
    };

    loadPage();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// --- IPC Handlers for Backup & Restore ---

// UPDATED: Now it just selects path
ipcMain.handle('backup-create', async () => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Backup',
        defaultPath: `SmartAcc-Backup-${new Date().toISOString().split('T')[0]}.db`,
        filters: [{ name: 'Smart Accountant Backup', extensions: ['db'] }]
    });

    if (canceled || !filePath) return { success: false, canceled: true };
    return { success: true, path: filePath };
});

ipcMain.handle('backup-restore', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Backup File',
        filters: [{ name: 'Smart Accountant Backup', extensions: ['db'] }],
        properties: ['openFile']
    });

    if (canceled || filePaths.length === 0) return { success: false };
    const backupPath = filePaths[0];

    try {
        const userDataPath = app.getPath('userData');
        const pendingPath = path.join(userDataPath, 'pending_restore.db');

        const stats = fs.statSync(backupPath);
        if (stats.size === 0) return { success: false, error: "Empty backup file." };

        fs.copyFileSync(backupPath, pendingPath);

        if (serverProcess) {
            killProcessTree(serverProcess.pid);
            serverProcess = null;
        }

        app.relaunch();
        app.exit(0);

        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('get-machine-id', async () => {
    try {
        if (process.platform === 'win32') {
            return execSync('wmic csproduct get uuid').toString().split('\n')[1].trim();
        }
        return 'DEV-MACHINE-ID';
    } catch (e) {
        return 'UNKNOWN-ID';
    }
});

if (app.isPackaged) {
    startServer();
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    try {
        const userDataPath = app.getPath('userData');
        const dbPath = path.join(userDataPath, DB_FILENAME);
        const backupsDir = path.join(userDataPath, 'backups');

        if (fs.existsSync(dbPath)) {
            if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir);
            const timestamp = new Date().getTime();
            const backupPath = path.join(backupsDir, `auto-backup-${timestamp}.db`);
            try { fs.copyFileSync(dbPath, backupPath); } catch (e) { }

            const files = fs.readdirSync(backupsDir).sort();
            while (files.length > 7) {
                const oldFile = files.shift();
                fs.unlinkSync(path.join(backupsDir, oldFile));
            }
        }
    } catch (e) { }

    if (serverProcess) {
        serverProcess.kill();
        killProcessTree(serverProcess.pid);
        serverProcess = null;
    }
});
