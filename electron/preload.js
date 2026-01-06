const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getMachineId: () => ipcRenderer.invoke('get-machine-id'),
    backupCreate: () => ipcRenderer.invoke('backup-create'),
    backupRestore: () => ipcRenderer.invoke('backup-restore'),
    getAppVersion: () => '1.0.0-offline',
});
