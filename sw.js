// Service Worker for Distrix - processes outbox in IndexedDB via Background Sync
const DB_NAME = 'TetrisDB';
const DB_VERSION = 1;

function openDB() {
    return new Promise((resolve, reject) => {
        const r = indexedDB.open(DB_NAME, DB_VERSION);
        r.onupgradeneeded = () => {
            const db = r.result;
            if (!db.objectStoreNames.contains('outbox')) {
                db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
            }
        };
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
    });
}

async function processOutboxOnce() {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(['outbox'], 'readwrite');
        const store = tx.objectStore('outbox');
        const getAllReq = store.getAll();
        getAllReq.onsuccess = async (e) => {
            const items = e.target.result || [];
            for (const item of items) {
                try {
                    if (!item.endpoint) {
                        // cannot proceed without endpoint
                        continue;
                    }
                    const res = await fetch(item.endpoint, {
                        method: item.type === 'account_update' ? 'POST' : 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(item.payload || {})
                    });
                    if (res && res.ok) {
                        // delete the item
                        try { store.delete(item.id); } catch (e) { /* ignore */ }
                    } else {
                        // increment attempts and leave for future retry
                        try {
                            const updated = Object.assign({}, item, { attempts: (item.attempts || 0) + 1, lastErrorAt: new Date().toISOString() });
                            store.put(updated);
                        } catch (e) { /* ignore */ }
                    }
                } catch (err) {
                    try {
                        const updated = Object.assign({}, item, { attempts: (item.attempts || 0) + 1, lastErrorAt: new Date().toISOString() });
                        store.put(updated);
                    } catch (e) { /* ignore */ }
                }
            }
            resolve();
        };
        getAllReq.onerror = () => resolve();
    });
}

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    self.clients.claim();
});

self.addEventListener('sync', (event) => {
    if (event.tag === 'outbox-sync') {
        event.waitUntil(processOutboxOnce());
    }
});

// Allow manual triggering via message from page
self.addEventListener('message', (ev) => {
    if (ev.data && ev.data.type === 'processOutbox') {
        ev.waitUntil(processOutboxOnce());
    }
});

// Simple fetch handler passthrough (no offline caching implemented)
self.addEventListener('fetch', (event) => {
    // let network handle it
});

console.log('Service Worker loaded');
