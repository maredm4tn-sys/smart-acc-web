const DB_NAME = 'SmartAcc_Offline_DB';
const DB_VERSION = 2;

export const STORES = {
    INVOICES: 'offline_invoices',
    PRODUCTS: 'local_products',
    CUSTOMERS: 'local_customers',
    SUPPLIERS: 'local_suppliers',
    SYNC_QUEUE: 'action_queue'
};

export async function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            Object.values(STORES).forEach(storeName => {
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                }
            });
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Mirroring: Save current online data to local DB for offline viewing
export async function mirrorData(storeName: string, data: any[]) {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    store.clear();

    data.forEach(item => {
        store.put(item);
    });

    return new Promise((resolve) => {
        tx.oncomplete = () => resolve(true);
    });
}

// Recovery: Get data from local DB when offline
export async function getLocalData(storeName: string): Promise<any[]> {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
    });
}

// Queueing: Save Add/Edit actions when offline
export async function queueAction(actionType: string, payload: any) {
    const db = await openDB();
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const cmd = {
        type: actionType,
        payload,
        timestamp: Date.now(),
        retryCount: 0
    };
    return new Promise((resolve) => {
        const req = store.add(cmd);
        req.onsuccess = () => resolve(true);
    });
}

export async function getQueuedActions(): Promise<any[]> {
    const db = await openDB();
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
    });
}

export async function markAsSynced(id: number) {
    const db = await openDB();
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    return new Promise((resolve) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
    });
}

// Utility for POS
export async function saveOfflineInvoice(invoiceData: any) {
    return queueAction('CREATE_INVOICE', invoiceData);
}

export async function getPendingInvoices(): Promise<any[]> {
    const actions = await getLocalData(STORES.SYNC_QUEUE);
    return actions.filter(a => a.type === 'CREATE_INVOICE').map(a => ({
        id: a.id,
        data: a.payload,
        timestamp: a.timestamp,
        synced: false
    }));
}

export async function clearSyncedInvoices() {
    // Already handled by markAsSynced (delete from queue)
}
