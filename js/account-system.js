// ============ SYSTÈME DE COMPTES AVEC SYNCHRONISATION SERVEUR ============
class AccountSystem {
    constructor() {
        try {
            this.accounts = {};
            this.currentUser = null;
            this.currentUserEmail = null; // Stocker l'email Google
            // URL du serveur de synchronisation (Railway déployé)
            // Remplacez par l'URL fournie par Railway. Exemple: https://caboose.proxy.rlwy.net
            // Possibilité d'override runtime via `window.SERVER_URL` ou `localStorage.tetrisServerUrl`
            // Default set to the Railway deployment domain you provided
            this.serverUrl = window.SERVER_URL || localStorage.getItem('tetrisServerUrl') || 'https://distrix-production.up.railway.app';
            // Fallback local pour développement (si on est en localhost, privilégier le dev local)
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                this.serverUrl = localStorage.getItem('tetrisServerUrl') || 'http://localhost:3000';
            }
            
            // Charger les comptes depuis localStorage, backup, ou IndexedDB
            this.initializeStorage();
        
            // Sauvegarde automatique toutes les 5 secondes
            this.startAutoSave();
            // Synchronisation entre onglets/fenêtres (même PC/mobile)
            this.setupStorageSync();
            // Démarrer le traitement de la file d'attente outbox
            this.startOutboxProcessing();
            // Register service worker for background sync if supported
            try {
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.register('/sw.js').then(reg => {
                        console.log('✅ Service Worker enregistré:', reg.scope);
                    }).catch(err => console.warn('⚠️ Erreur enregistrement Service Worker:', err));
                }
            } catch (e) { /* ignore */ }
            // ❌ DO NOT AUTO-SYNC (causes data loss) - LOCAL-ONLY MODE
            console.log('ℹ️ Mode LOCAL-ONLY: Sauvegarde uniquement locale (localStorage). Sync manuelle via bouton.');
            
            console.log('✅ AccountSystem initialisé avec succès');
            console.log(`� Backend: ${this.serverUrl}`);
            if (!this.serverUrl || this.serverUrl.indexOf('proxy.rlwy.net') !== -1) {
                console.warn('ℹ️ Si vous rencontrez des erreurs TLS (ERR_CERT_COMMON_NAME_INVALID), définissez une URL backend valide:');
                console.warn("   - Dans la console: window.SERVER_URL = 'https://your-backend.example'; location.reload();");
                console.warn("   - Ou en permanence: localStorage.setItem('tetrisServerUrl','https://your-backend.example'); location.reload();");
            }

            // UI helper: add a small 'Forcer sync' button so user can manually flush outbox
            try { this.createOutboxButton(); } catch (e) { /* ignore */ }

            // Try to send latest account with navigator.sendBeacon when the page unloads
            try {
                window.addEventListener('beforeunload', (ev) => {
                    try {
                        if (!this.currentUser || !this.serverUrl) return;
                        const account = this.accounts[this.currentUser];
                        const email = this.currentUserEmail || account.email || (this.currentUser + '@local');
                        const url = `${this.serverUrl}/api/accounts/${encodeURIComponent(email)}`;
                        const payload = JSON.stringify(account || {});
                        if (navigator && navigator.sendBeacon) {
                            const blob = new Blob([payload], { type: 'application/json' });
                            const ok = navigator.sendBeacon(url, blob);
                            if (ok) console.log('📤 sendBeacon: tentative d\'envoi sur beforeunload');
                        }
                    } catch (e) {
                        console.warn('⚠️ beforeunload sendBeacon failed', e);
                    }
                });
            } catch (e) {
                /* ignore */
            }

        } catch (error) {
            console.error('❌ Erreur initialisation AccountSystem:', error);
            console.error('Stack:', error.stack);
            // Continuer quand même - on aura au moins les methods
        }
    }

    // Initialiser le stockage avec fallback en cas d'erreur
    initializeStorage() {
        // D'abord essayer le localStorage principal
        const mainData = localStorage.getItem('tetrisAccounts');
        if (mainData) {
            try {
                this.accounts = JSON.parse(mainData);
                this.currentUser = localStorage.getItem('tetrisCurrentUser');
                console.log('✅ Comptes chargés depuis localStorage');
                // Signaler que les comptes sont prêts (synchrones)
                try { window.dispatchEvent(new CustomEvent('accounts-ready')); } catch (e) {}
                return;
            } catch (error) {
                console.warn('⚠️ Erreur parse localStorage, essai du backup...');
            }
        }
        
        // Essayer le backup localStorage
        const backupData = localStorage.getItem('tetrisAccountsBackup');
        if (backupData) {
            try {
                this.accounts = JSON.parse(backupData);
                this.currentUser = localStorage.getItem('tetrisCurrentUser');
                // Restaurer le principal depuis le backup
                localStorage.setItem('tetrisAccounts', backupData);
                console.log('✅ Comptes restaurés depuis le backup localStorage');
                // Signaler que les comptes sont prêts (synchrones)
                try { window.dispatchEvent(new CustomEvent('accounts-ready')); } catch (e) {}
                return;
            } catch (error) {
                console.warn('⚠️ Erreur parse backup localStorage...');
            }
        }
        
        // Essayer IndexedDB
        this.loadFromIndexedDB().then(data => {
            if (data) {
                this.accounts = data.accounts || {};
                this.currentUser = data.currentUser || null;
                // Resauvegarder dans localStorage
                try {
                    localStorage.setItem('tetrisAccounts', JSON.stringify(this.accounts));
                    if (this.currentUser) localStorage.setItem('tetrisCurrentUser', this.currentUser);
                } catch (e) { console.warn('⚠️ Erreur écriture localStorage après IndexedDB restore', e); }
                console.log('✅ Comptes restaurés depuis IndexedDB');
            } else {
                // Si aucune donnée trouvée, tenter de restaurer depuis l'historique local durable
                try {
                    const histRaw = localStorage.getItem('tetrisAccountsHistory');
                    if (histRaw) {
                        const hist = JSON.parse(histRaw);
                        if (Array.isArray(hist) && hist.length > 0) {
                            const last = hist[hist.length - 1];
                            this.accounts = last.accounts || {};
                            this.currentUser = last.currentUser || null;
                            try {
                                localStorage.setItem('tetrisAccounts', JSON.stringify(this.accounts));
                                if (this.currentUser) localStorage.setItem('tetrisCurrentUser', this.currentUser);
                            } catch (e) { console.warn('⚠️ Erreur écriture localStorage après history restore', e); }
                            console.log('🔄 Restauré depuis l\'historique local (tetrisAccountsHistory)');
                        } else {
                            console.log('ℹ️ Aucunes données existantes trouvées');
                            this.accounts = {};
                            this.currentUser = null;
                        }
                    } else {
                        console.log('ℹ️ Aucunes données existantes trouvées');
                        this.accounts = {};
                        this.currentUser = null;
                    }
                } catch (e) {
                    console.warn('⚠️ Erreur en lisant l\'historique local:', e);
                    this.accounts = {};
                    this.currentUser = null;
                }
            }

            // Après avoir chargé les comptes, migrer les anciens pour être compatibles
            this.migrateOldAccounts();
            // Signaler que les comptes sont prêts (après la migration async)
            try { window.dispatchEvent(new CustomEvent('accounts-ready')); } catch (e) {}
        });
    }

    // ============ MIGRATION DES ANCIENS COMPTES ============
    migrateOldAccounts() {
        let hasMigrated = false;
        const migrationLog = [];
        const CURRENT_VERSION = 2; // Version 2 = nouvelle table XP + affichage XP correct

        for (const pseudo in this.accounts) {
            const account = this.accounts[pseudo];
            let accountChanged = false;

            // Vérifier la version du compte
            const accountVersion = account.version || 0;
            if (accountVersion < CURRENT_VERSION) {
                account.version = CURRENT_VERSION;
                accountChanged = true;
                migrationLog.push(`➡️ ${pseudo}: Version ${accountVersion} → ${CURRENT_VERSION}`);
            }

            // Recalculer le niveau selon le nouvel XP system (0→75000 sur 13 niveaux)
            // TOUJOURS le faire pour les anciens comptes (même si version existe)
            if (accountVersion < CURRENT_VERSION && window.XpSystem) {
                const newLevel = window.XpSystem.getLevelFromXP(account.xp);
                if (newLevel !== account.level) {
                    migrationLog.push(`   ✓ Niveau: ${account.level} → ${newLevel} (${account.xp} XP total)`);
                    account.level = newLevel;
                    accountChanged = true;
                }
            }

            // Vérifier et mettre à jour ownedItems
            if (!account.ownedItems) {
                account.ownedItems = { skins: [0], musics: [0] };
                accountChanged = true;
                migrationLog.push(`   ✓ Structure ownedItems créée`);
            }

            // Vérifier les skins et musics
            if (account.ownedItems.skins && !Array.isArray(account.ownedItems.skins)) {
                account.ownedItems.skins = [0];
                accountChanged = true;
                migrationLog.push(`   ✓ Skins: array réparé`);
            }

            if (account.ownedItems.musics && !Array.isArray(account.ownedItems.musics)) {
                account.ownedItems.musics = [0];
                accountChanged = true;
                migrationLog.push(`   ✓ Musics: array réparé`);
            }

            // S'assurer qu'il y a toujours au moins l'item par défaut
            if (!account.ownedItems.skins.includes(0)) {
                account.ownedItems.skins.push(0);
                accountChanged = true;
                migrationLog.push(`   ✓ Skin par défaut ajouté`);
            }

            if (!account.ownedItems.musics.includes(0)) {
                account.ownedItems.musics.push(0);
                accountChanged = true;
                migrationLog.push(`   ✓ Musique par défaut ajoutée`);
            }

            // Vérifier que equippedSkin/Music existent et sont valides
            if (account.equippedSkin === undefined) {
                account.equippedSkin = 0;
                accountChanged = true;
                migrationLog.push(`   ✓ equippedSkin: défaut défini`);
            }

            if (account.equippedMusic === undefined) {
                account.equippedMusic = 0;
                accountChanged = true;
                migrationLog.push(`   ✓ equippedMusic: défaut défini`);
            }

            // Vérifier que les items équipés sont bien possédés
            if (account.ownedItems.skins && !account.ownedItems.skins.includes(account.equippedSkin)) {
                account.equippedSkin = 0;
                accountChanged = true;
                migrationLog.push(`   ✓ equippedSkin: reset (pas possédé)`);
            }

            if (account.ownedItems.musics && !account.ownedItems.musics.includes(account.equippedMusic)) {
                account.equippedMusic = 0;
                accountChanged = true;
                migrationLog.push(`   ✓ equippedMusic: reset (pas possédé)`);
            }

            if (accountChanged) {
                hasMigrated = true;
            }
        }

        if (hasMigrated) {
            console.log('🔄 MIGRATION DES ANCIENS COMPTES:');
            migrationLog.forEach(log => console.log(log));
            this.saveAccounts();
            console.log('✅✅ Migration complétée et sauvegardée');
        } else {
            console.log('ℹ️ Aucune migration nécessaire - tous les comptes sont à jour');
        }
    }

    // ============ FORCE MIGRATION POUR TOUS LES COMPTES ============
    // Cette fonction met à jour TOUS les comptes, même les récents, pour s'assurer
    // que les changements importants (tables XP, etc.) sont appliqués partout
    forceUpdateAllAccounts() {
        console.log('🔄 FORCE UPDATE - Application des changements à tous les comptes...');
        let updateCount = 0;
        const updateLog = [];

        for (const pseudo in this.accounts) {
            const account = this.accounts[pseudo];
            let accountChanged = false;

            // Forcer la mise à jour du niveau avec le nouvel XP system
            if (window.XpSystem) {
                const correctLevel = window.XpSystem.getLevelFromXP(account.xp);
                if (correctLevel !== account.level) {
                    updateLog.push(`🔄 ${pseudo}: Niveau ${account.level} → ${correctLevel} (${account.xp} XP)`);
                    account.level = correctLevel;
                    accountChanged = true;
                }
            }

            // S'assurer que la version est à jour
            if (account.version !== 2) {
                account.version = 2;
                accountChanged = true;
                if (!updateLog.some(log => log.includes(pseudo))) {
                    updateLog.push(`🔄 ${pseudo}: Version mise à jour vers 2`);
                }
            }

            // Vérifier la structure ownedItems
            if (!account.ownedItems || typeof account.ownedItems !== 'object') {
                account.ownedItems = { skins: [0], musics: [0] };
                accountChanged = true;
                updateLog.push(`   ✓ ${pseudo}: Structure ownedItems restaurée`);
            }

            // S'assurer que les arrays sont valides
            if (!Array.isArray(account.ownedItems.skins)) {
                account.ownedItems.skins = [0];
                accountChanged = true;
            }
            if (!Array.isArray(account.ownedItems.musics)) {
                account.ownedItems.musics = [0];
                accountChanged = true;
            }

            // S'assurer que l'item par défaut existe
            if (!account.ownedItems.skins.includes(0)) {
                account.ownedItems.skins.unshift(0);
                accountChanged = true;
            }
            if (!account.ownedItems.musics.includes(0)) {
                account.ownedItems.musics.unshift(0);
                accountChanged = true;
            }

            // Valider les items équipés
            if (typeof account.equippedSkin !== 'number' || !account.ownedItems.skins.includes(account.equippedSkin)) {
                account.equippedSkin = 0;
                accountChanged = true;
            }
            if (typeof account.equippedMusic !== 'number' || !account.ownedItems.musics.includes(account.equippedMusic)) {
                account.equippedMusic = 0;
                accountChanged = true;
            }

            if (accountChanged) {
                updateCount++;
            }
        }

        if (updateCount > 0) {
            console.log(`✅ Force update appliqué à ${updateCount} compte(s):`);
            updateLog.forEach(log => console.log('   ' + log));
            this.saveAccounts();
            console.log('✅✅ Tous les comptes ont été mis à jour et sauvegardés');
        } else {
            console.log('ℹ️ Aucune mise à jour nécessaire - tous les comptes sont en ordre');
        }

        return updateCount;
    }

    // Récupérer un compte par email depuis IndexedDB (pour retrouver après effacement localStorage)
    async getAccountByEmailFromIndexedDB(email) {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.open('TetrisDB', 1);
                
                request.onerror = () => {
                    console.warn('⚠️ IndexedDB non disponible');
                    resolve(null);
                };
                
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    const transaction = db.transaction(['accountsByEmail'], 'readonly');
                    const store = transaction.objectStore('accountsByEmail');
                    const getRequest = store.get(email);
                    
                    getRequest.onsuccess = () => {
                        if (getRequest.result) {
                            console.log(`✅ Compte retrouvé dans IndexedDB pour ${email}`);
                            resolve(getRequest.result);
                        } else {
                            resolve(null);
                        }
                    };
                    getRequest.onerror = () => resolve(null);
                };
            } catch (error) {
                console.warn('⚠️ Erreur lors de la récupération du compte:', error);
                resolve(null);
            }
        });
    }

    // Charger depuis IndexedDB
    async loadFromIndexedDB() {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.open('TetrisDB', 1);
                
                request.onerror = () => {
                    console.warn('⚠️ IndexedDB non disponible');
                    resolve(null);
                };
                
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    const transaction = db.transaction(['accounts'], 'readonly');
                    const store = transaction.objectStore('accounts');
                    const getRequest = store.get('data');
                    
                    getRequest.onsuccess = () => {
                        resolve(getRequest.result || null);
                    };
                    getRequest.onerror = () => resolve(null);
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('accounts')) {
                        db.createObjectStore('accounts');
                    }
                    // Store individual accounts by email for easy retrieval after localStorage clear
                    if (!db.objectStoreNames.contains('accountsByEmail')) {
                        db.createObjectStore('accountsByEmail'); // key: email, value: account
                    }
                    // Outbox for queued sync operations when offline/unreliable network
                    if (!db.objectStoreNames.contains('outbox')) {
                        // keyPath auto-increment id
                        db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
                    }
                };
            } catch (error) {
                console.warn('⚠️ Erreur IndexedDB:', error);
                resolve(null);
            }
        });
    }

    // Sauvegarder dans IndexedDB
    async saveToIndexedDB() {
        try {
            const request = indexedDB.open('TetrisDB', 1);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('accounts')) {
                    db.createObjectStore('accounts');
                }
                if (!db.objectStoreNames.contains('accountsByEmail')) {
                    db.createObjectStore('accountsByEmail');
                }
                if (!db.objectStoreNames.contains('outbox')) {
                    db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['accounts', 'accountsByEmail'], 'readwrite');
                const mainStore = transaction.objectStore('accounts');
                const emailStore = transaction.objectStore('accountsByEmail');

                // Save main data
                mainStore.put({
                    accounts: this.accounts,
                    currentUser: this.currentUser,
                    timestamp: new Date().toISOString()
                }, 'data');

                // Save each account individually by email for easy retrieval
                for (const pseudo in this.accounts) {
                    const account = this.accounts[pseudo];
                    const email = account.email || pseudo + '@local'; // Use stored email or fallback
                    emailStore.put(account, email);
                }
            };
        } catch (error) {
            console.warn('⚠️ Erreur sauvegarde IndexedDB:', error);
        }
    }

    // (Comportement simple) pas de détection automatique complexe — utiliser localhost:3000 par défaut

    loadAccounts() {
        return this.accounts;
    }

    loadCurrentSession() {
        return this.currentUser;
    }

    saveCurrentSession() {
        if (this.currentUser) {
            localStorage.setItem('tetrisCurrentUser', this.currentUser);
        } else {
            localStorage.removeItem('tetrisCurrentUser');
        }
    }

    saveAccounts() {
        // QUADRUPLE SAUVEGARDE: localStorage principal + backup localStorage + sessionStorage + IndexedDB
        const dataString = JSON.stringify(this.accounts);
        // Also keep a durable history of recent snapshots to recover from accidental overwrites/clears
        try {
            if (this.accounts && Object.keys(this.accounts).length > 0) {
                const rawHist = localStorage.getItem('tetrisAccountsHistory');
                let hist = [];
                try { hist = rawHist ? JSON.parse(rawHist) : []; } catch (e) { hist = []; }
                const snapshot = { accounts: this.accounts, currentUser: this.currentUser, ts: new Date().toISOString() };
                hist.push(snapshot);
                // Keep last 20 snapshots
                if (hist.length > 20) hist = hist.slice(hist.length - 20);
                try { localStorage.setItem('tetrisAccountsHistory', JSON.stringify(hist)); } catch (e) { /* ignore */ }
            }
        } catch (e) {
            console.warn('⚠️ Erreur lors de la mise à jour de l\'historique local:', e);
        }
        
        // Sauvegarder dans localStorage (principal)
        try {
            localStorage.setItem('tetrisAccounts', dataString);
            localStorage.setItem('tetrisLastSave', new Date().toISOString());
            console.log('✅ Sauvegarde localStorage principale réussie');
        } catch (error) {
            console.error('❌ Erreur sauvegarde localStorage:', error);
        }
        
        // Sauvegarder un backup dans localStorage aussi (redondance)
        try {
            localStorage.setItem('tetrisAccountsBackup', dataString);
            console.log('✅ Sauvegarde localStorage backup réussie');
        } catch (error) {
            console.error('❌ Erreur sauvegarde backup localStorage:', error);
        }
        
        // Sauvegarder aussi dans sessionStorage pour la session actuelle
        try {
            sessionStorage.setItem('tetrisAccountsSession', dataString);
        } catch (error) {
            console.error('❌ Erreur sauvegarde sessionStorage:', error);
        }
        
        // Sauvegarder dans IndexedDB pour persistance maximale
        this.saveToIndexedDB();
        
        // Vérifier que la sauvegarde s'est bien faite localement
        try {
            const verify = localStorage.getItem('tetrisAccounts');
            if (verify !== dataString) {
                console.error('❌ ERREUR: La sauvegarde locale n\'a pas fonctionné!');
                alert('⚠️ ATTENTION: Erreur lors de la sauvegarde des données!');
            } else {
                console.log('✅ VÉRIFICATION OK - Sauvegarde confirmée - ' + Object.keys(this.accounts).length + ' compte(s)');
            }
        } catch (error) {
            console.error('❌ Erreur lors de la vérification:', error);
        }
        
        // Don't auto-sync to server (LOCAL-ONLY mode) - queue for manual sync only
    }

    // Enqueue an operation into the IndexedDB outbox for later reliable syncing
    async enqueueOutbox(item) {
        try {
            const req = indexedDB.open('TetrisDB', 1);
            req.onsuccess = (event) => {
                const db = event.target.result;
                const tx = db.transaction(['outbox'], 'readwrite');
                const store = tx.objectStore('outbox');
                const now = new Date().toISOString();
                // Include an explicit endpoint so the Service Worker can send without access to window.serverUrl
                const endpoint = item.endpoint || (item.type === 'account_update' && item.email ? `${this.serverUrl}/api/accounts/${encodeURIComponent(item.email)}` : (this.serverUrl + '/api/accounts'));
                const record = Object.assign({ createdAt: now, attempts: 0, endpoint: endpoint }, item);
                store.add(record);
                tx.oncomplete = () => {
                    console.log('📥 Enqueued outbox item', item.type || 'item');
                    // Try to register a background sync to drain the outbox (if supported)
                    try {
                        if (navigator && navigator.serviceWorker && 'SyncManager' in window) {
                            navigator.serviceWorker.ready.then(reg => {
                                reg.sync.register('outbox-sync').then(() => console.log('🔁 Background sync registered (outbox-sync)')).catch(err => console.warn('⚠️ Background sync register failed', err));
                            });
                        }
                    } catch (e) { /* ignore */ }
                };
                tx.onerror = (e) => {
                    console.warn('⚠️ Échec ajout outbox:', e.target.error);
                };
            };
            req.onerror = () => {
                console.warn('⚠️ IndexedDB non disponible - outbox non enregistré');
            };
        } catch (error) {
            console.warn('⚠️ Exception enqueueOutbox:', error);
        }
    }

    // Process the outbox: attempt to send queued ops to server
    async processOutbox() {
        if (!this.serverUrl) return;
        try {
            const req = indexedDB.open('TetrisDB', 1);
            req.onsuccess = async (event) => {
                const db = event.target.result;
                const tx = db.transaction(['outbox'], 'readwrite');
                const store = tx.objectStore('outbox');
                const cursorReq = store.openCursor();
                cursorReq.onsuccess = async (ev) => {
                    const cursor = ev.target.result;
                    if (!cursor) return;
                    const record = cursor.value;
                    // Simple exponential backoff based on attempts
                    if (record.attempts >= 5) {
                        console.warn('⚠️ Outbox item exceeded attempts, skipping:', record);
                        // remove it
                        cursor.delete();
                        cursor.continue();
                        return;
                    }

                    try {
                        if (record.type === 'account_update' && record.email && record.payload) {
                            const url = `${this.serverUrl}/api/accounts/${encodeURIComponent(record.email)}`;
                            const res = await fetch(url, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(record.payload)
                            });
                            if (res.ok) {
                                console.log('📤 Outbox item synced:', record.email);
                                cursor.delete();
                                cursor.continue();
                                return;
                            } else {
                                const txt = await res.text().catch(() => null);
                                console.warn('⚠️ Server rejected outbox item:', res.status, txt);
                            }
                        } else if (record.type === 'bulk_accounts') {
                            const url = `${this.serverUrl}/api/accounts`;
                            const res = await fetch(url, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(record.payload)
                            });
                            if (res.ok) {
                                console.log('📤 Outbox bulk synced');
                                cursor.delete();
                                cursor.continue();
                                return;
                            }
                        }
                    } catch (err) {
                        console.warn('⚠️ Outbox send failed:', err);
                    }

                    // If we reach here, increment attempts and continue later
                    const updated = Object.assign({}, record, { attempts: (record.attempts || 0) + 1, lastErrorAt: new Date().toISOString() });
                    cursor.update(updated);
                    cursor.continue();
                };
                cursorReq.onerror = (e) => {
                    console.warn('⚠️ Erreur lecture outbox:', e.target.error);
                };
            };
            req.onerror = () => {
                console.warn('⚠️ IndexedDB non disponible (processOutbox)');
            };
        } catch (error) {
            console.warn('⚠️ Exception processOutbox:', error);
        }
    }

    // Start periodic processing of outbox and drain on network online
    startOutboxProcessing() {
        // Try immediately and then periodically
        this.processOutbox();
        this._outboxInterval = setInterval(() => this.processOutbox(), 10000); // every 10s
        window.addEventListener('online', () => {
            console.log('🔌 Browser online - draining outbox');
            this.processOutbox();
        });

        // Install mobile reliability handlers (page visibility & pagehide)
        try {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    console.log('📴 visibilitychange:hidden - attempting final outbox drain and sendBeacon');
                    try { this.processOutbox(); } catch (e) { /* ignore */ }
                    try {
                        if (this.currentUser && this.serverUrl && navigator && navigator.sendBeacon) {
                            const account = this.accounts[this.currentUser] || {};
                            const email = this.currentUserEmail || account.email || (this.currentUser + '@local');
                            const url = `${this.serverUrl}/api/accounts/${encodeURIComponent(email)}`;
                            const blob = new Blob([JSON.stringify(account)], { type: 'application/json' });
                            navigator.sendBeacon(url, blob);
                        }
                    } catch (e) { /* ignore */ }
                }
            });

            // pagehide is more reliable on mobile than beforeunload
            window.addEventListener('pagehide', () => {
                console.log('pagehide - attempting final outbox drain and sendBeacon');
                try { this.processOutbox(); } catch (e) { /* ignore */ }
                try {
                    if (this.currentUser && this.serverUrl && navigator && navigator.sendBeacon) {
                        const account = this.accounts[this.currentUser] || {};
                        const email = this.currentUserEmail || account.email || (this.currentUser + '@local');
                        const url = `${this.serverUrl}/api/accounts/${encodeURIComponent(email)}`;
                        const blob = new Blob([JSON.stringify(account)], { type: 'application/json' });
                        navigator.sendBeacon(url, blob);
                    }
                } catch (e) { /* ignore */ }
            });
        } catch (e) {
            console.warn('⚠️ Failed to install mobile reliability handlers', e);
        }
    }

    // Enable safe server sync: performs a health check, drains the outbox and
    // optionally fetches server data only if there are no local accounts.
    async enableServerSync({ fetchServerIfNoLocal = true } = {}) {
        if (!this.serverUrl) {
            console.warn('⚠️ enableServerSync: no serverUrl configured');
            return false;
        }

        try {
            const health = await fetch(`${this.serverUrl}/api/health`, { method: 'GET' });
            if (!health.ok) {
                console.warn('⚠️ Server health check failed:', health.status);
                return false;
            }
            console.log('✅ Server reachable, draining outbox now');

            // Drain outbox first (sends queued per-account updates)
            await this.processOutbox();

            // If no local accounts and allowed, pull server data (safe path)
            if (fetchServerIfNoLocal) {
                const hasLocal = this.accounts && Object.keys(this.accounts).length > 0;
                if (!hasLocal) {
                    try {
                        const resp = await fetch(`${this.serverUrl}/api/accounts`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
                        if (resp.ok) {
                            const data = await resp.json();
                            if (data && data.success && data.accounts) {
                                this.accounts = Object.assign({}, data.accounts);
                                try { localStorage.setItem('tetrisAccounts', JSON.stringify(this.accounts)); } catch (e) {}
                                console.log('🔄 Server accounts pulled into local storage (no local accounts existed)');
                            }
                        }
                    } catch (e) {
                        console.warn('⚠️ Failed to fetch server accounts:', e);
                    }
                } else {
                    console.log('ℹ️ Local accounts exist — skipping server pull to avoid overwriting');
                }
            }

            console.log('✅ enableServerSync completed');
            return true;
        } catch (error) {
            console.warn('⚠️ enableServerSync failed:', error);
            return false;
        }
    }

    // Create a floating button UI that allows the user to force a sync and inspect the outbox
    createOutboxButton() {
        if (document.getElementById('force-sync-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'force-sync-btn';
        btn.textContent = 'Forcer sync';
        btn.title = 'Forcer la synchronisation des comptes (affiche outbox)';
        Object.assign(btn.style, {
            position: 'fixed',
            right: '12px',
            bottom: '12px',
            zIndex: 99999,
            padding: '8px 10px',
            background: '#0b74de',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            fontSize: '14px'
        });

        btn.addEventListener('click', async () => {
            try {
                console.log('🔁 Forcer vidage outbox...');
                await this.processOutbox();
                // show outbox contents
                indexedDB.open('TetrisDB').onsuccess = e => {
                    const db = e.target.result;
                    const tx = db.transaction('outbox','readonly');
                    const store = tx.objectStore('outbox');
                    store.getAll().onsuccess = ev => {
                        const items = ev.target.result || [];
                        if (items.length === 0) {
                            alert('Outbox vide — tout est synchronisé (ou en attente du serveur).');
                        } else {
                            console.log('Outbox items:', items);
                            alert('Outbox contient ' + items.length + ' élément(s). Voir la console pour détails.');
                        }
                    };
                };
            } catch (err) {
                console.warn('⚠️ Erreur lors du forçage de vidage outbox:', err);
                alert('Erreur lors du forçage (voir console)');
            }
        });

        document.body.appendChild(btn);

        // Update button label with count periodically
        setInterval(() => {
            try {
                indexedDB.open('TetrisDB').onsuccess = e => {
                    const db = e.target.result;
                    const tx = db.transaction('outbox','readonly');
                    const store = tx.objectStore('outbox');
                    store.count().onsuccess = ev => {
                        const c = ev.target.result || 0;
                        btn.textContent = c > 0 ? `Forcer sync (${c})` : 'Forcer sync';
                    };
                };
            } catch (e) { /* ignore */ }
        }, 3000);
    }

    // Synchroniser avec le serveur (DISABLED - LOCAL-ONLY mode)
    async syncWithServer() {
        console.warn('⚠️ syncWithServer disabled (LOCAL-ONLY mode). Use "Forcer sync" button to manually sync.');
        return;
    }

    // Envoyer les comptes au serveur (DISABLED - LOCAL-ONLY mode)
    async syncToServer() {
        console.warn('⚠️ syncToServer disabled (LOCAL-ONLY mode). Use "Forcer sync" button for manual sync.');
        return;
    }

    // Synchroniser un compte spécifique avec le backend (DISABLED AUTO - queue only)
    async syncAccountToServer() {
        if (!this.currentUserEmail || !this.currentUser) return false;
        // Queue for manual sync only - no auto-sync
        const account = this.accounts[this.currentUser];
        const email = this.currentUserEmail || account.email || (this.currentUser + '@local');
        this.enqueueOutbox({ type: 'account_update', email: email, payload: account });
        console.log('📥 Compte queued in outbox (use "Forcer sync" button to send)');
        return true;
    }


    // Synchronisation entre onglets/fenêtres (si on ouvre plusieurs onglets)
    setupStorageSync() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'tetrisAccounts') {
                console.log('🔄 Synchronisation détectée - Rechargement des comptes');
                this.accounts = this.loadAccounts();
            }
            if (e.key === 'tetrisCurrentUser') {
                console.log('🔄 Synchronisation détectée - Rechargement de l\'utilisateur');
                this.currentUser = this.loadCurrentSession();
            }
        });
    }

    // Sauvegarde automatique toutes les 5 secondes
    startAutoSave() {
        setInterval(() => {
            if (this.currentUser) {
                this.saveAccounts();
            }
        }, 5000);
    }

    createAccount(pseudo, code) {
        // Vérifier que le pseudo n'existe pas déjà
        if (this.accounts[pseudo]) {
            return { success: false, message: 'Pseudo déjà utilisé' };
        }

        // Créer le compte avec timestamp de création
        this.accounts[pseudo] = {
            pseudo: pseudo,
            code: code,
            email: null, // Will be filled by Google Sign-In (e.g., user@gmail.com)
            googleSub: code, // Store Google user ID for account recovery
            xp: 0,
            level: 1,
            bestScore: 0,
            ownedItems: {
                skins: [0], // Index 0 est le skin par défaut
                musics: [0]
            },
            equippedSkin: 0,
            equippedMusic: 0,
            musicVolume: 100,
            effectsVolume: 100,
            controls: {
                left: 'a',
                right: 'd',
                rotate: 'w',
                down: 's',
                hardDrop: ' '
            },
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };

        // Sauvegarder immédiatement et vérifier
        this.saveAccounts();
        
        // DOUBLE VÉRIFICATION: vérifier dans localStorage ET dans memory
        const savedInMemory = this.accounts[pseudo] ? true : false;
        const savedInLocalStorage = localStorage.getItem('tetrisAccounts');
        const savedData = savedInLocalStorage ? JSON.parse(savedInLocalStorage) : {};
        const savedInStorage = savedData[pseudo] ? true : false;
        
        if (savedInMemory && savedInStorage) {
            console.log(`✅✅ Compte "${pseudo}" créé et VÉRIFIÉ dans la mémoire ET localStorage`);
            return { success: true, message: `✅ Compte créé et sauvegardé` };
        } else if (savedInMemory) {
            console.warn(`⚠️ Compte "${pseudo}" en mémoire mais NON trouvé dans localStorage!`);
            return { success: false, message: 'ERREUR: Impossible de sauvegarder le compte' };
        } else {
            console.error(`❌ Erreur: Le compte n'a pas pu être créé!`);
            return { success: false, message: 'Erreur lors de la création du compte' };
        }
    }

    login(pseudo, code) {
        // VÉRIFIER que le compte existe dans localStorage ET dans la mémoire
        const accountInMemory = this.accounts[pseudo];
        
        // Si pas en mémoire, essayer de recharger depuis localStorage
        if (!accountInMemory) {
            const storageData = localStorage.getItem('tetrisAccounts');
            if (storageData) {
                try {
                    const allAccounts = JSON.parse(storageData);
                    if (allAccounts[pseudo]) {
                        this.accounts = allAccounts;
                        console.log('🔄 Compte rechargé depuis localStorage');
                    } else {
                        return { success: false, message: 'Pseudo non trouvé' };
                    }
                } catch (error) {
                    console.error('❌ Erreur lors du rechargement:', error);
                    return { success: false, message: 'Pseudo non trouvé' };
                }
            } else {
                return { success: false, message: 'Pseudo non trouvé' };
            }
        }
        
        const account = this.accounts[pseudo];
        
        if (!account) {
            return { success: false, message: 'Pseudo non trouvé' };
        }

        if (account.code !== code) {
            return { success: false, message: 'Code incorrect' };
        }

        this.currentUser = pseudo;
        account.lastLogin = new Date().toISOString();
        
        // Recalculer le niveau en fonction de l'XP et du nouveau système de progression
        if (window.XpSystem) {
            account.level = window.XpSystem.getLevelFromXP(account.xp);
        }
        
        this.saveAccounts();
        this.saveCurrentSession();
        console.log(`✅✅ Connexion réussie: ${pseudo} - Compte VÉRIFIÉ`);
        return { success: true, message: 'Connexion réussie' };
    }

    logout() {
        // Se déconnecter localement sans forcer une resynchronisation complète
        // (évite d'écraser les données serveur par erreur)
        console.log('🔒 Déconnexion en cours - comptes en mémoire:', Object.keys(this.accounts).length);
        this.currentUser = null;
        this.saveCurrentSession();
        // Ne PAS appeler this.saveAccounts() ici pour éviter toute écriture involontaire au serveur
        console.log('✅ Déconnexion locale réussie (session locale effacée)');
    }

    getCurrentUser() {
        if (!this.currentUser) return null;
        return this.accounts[this.currentUser];
    }

    updateUser(updates) {
        if (!this.currentUser) return;
        
        Object.assign(this.accounts[this.currentUser], updates);
        this.saveAccounts(); // Sauvegarde IMMÉDIATE
    }

    addXP(amount) {
        if (!this.currentUser) return;
        
        const user = this.accounts[this.currentUser];
        user.xp += amount;
        
        // Recalculer le niveau
        const XpSystem = window.XpSystem;
        if (XpSystem) {
            user.level = XpSystem.getLevelFromXP(user.xp);
        }
        
        this.saveAccounts(); // Sauvegarde IMMÉDIATE
        
        // Synchroniser avec le backend si email Google est disponible
        if (this.currentUserEmail) {
            this.syncAccountToServer();
        }
    }

    updateBestScore(score) {
        if (!this.currentUser) return;
        
        const user = this.accounts[this.currentUser];
        if (score > user.bestScore) {
            user.bestScore = score;
            this.saveAccounts(); // Sauvegarde IMMÉDIATE
            
            // Synchroniser avec le backend si email Google
            if (this.currentUserEmail) {
                this.syncAccountToServer();
            }
            return true;
        }
        return false;
    }

    getAllAccounts() {
        return Object.values(this.accounts);
    }

    getTopScores(limit = 3) {
        return Object.values(this.accounts)
            .sort((a, b) => b.bestScore - a.bestScore)
            .slice(0, limit)
            .map(user => ({ pseudo: user.pseudo, score: user.bestScore }));
    }

    buyItem(itemType, itemIndex) {
        if (!this.currentUser) return { success: false, message: 'Utilisateur non connecté' };
        
        const user = this.accounts[this.currentUser];
        const ownedList = user.ownedItems[itemType];
        
        if (ownedList.includes(itemIndex)) {
            return { success: false, message: 'Objet déjà acheté' };
        }

        ownedList.push(itemIndex);
        this.saveAccounts();
        return { success: true, message: 'Achat réussi' };
    }

    isItemOwned(itemType, itemIndex) {
        if (!this.currentUser) return false;
        
        const user = this.accounts[this.currentUser];
        return user.ownedItems[itemType].includes(itemIndex);
    }

    equipItem(itemType, itemIndex) {
        if (!this.currentUser) return;
        
        const user = this.accounts[this.currentUser];
        
        if (itemType === 'skins') {
            user.equippedSkin = itemIndex;
        } else if (itemType === 'musics') {
            user.equippedMusic = itemIndex;
        }
        
        this.saveAccounts();
    }

    updateControls(controls) {
        if (!this.currentUser) return;
        
        this.accounts[this.currentUser].controls = controls;
        this.saveAccounts();
    }

    updateVolume(type, value) {
        if (!this.currentUser) return;
        
        if (type === 'music') {
            this.accounts[this.currentUser].musicVolume = value;
        } else if (type === 'effects') {
            this.accounts[this.currentUser].effectsVolume = value;
        }
        
        this.saveAccounts();
    }

    // ============ SYNCHRONISATION ROBUSTE DES ÉQUIPEMENTS ============
    
    /**
     * Synchroniser les changements d'équipement (skin/musique) ET mettre à jour
     * TOUS les comptes avec les nouveaux items, sans doublons
     */
    syncEquipmentChange(itemType, itemIndex) {
        if (!this.currentUser) return;
        
        const user = this.accounts[this.currentUser];
        const ownedList = user.ownedItems[itemType];
        
        // Vérifier que l'item n'existe pas déjà dans owned (pas de doublon)
        if (!ownedList.includes(itemIndex)) {
            ownedList.push(itemIndex);
            console.log(`✅ ${itemType} #${itemIndex} ajouté (pas de doublon)`);
        } else {
            console.log(`ℹ️ ${itemType} #${itemIndex} déjà possédé (doublon évité)`);
        }
        
        // Équiper l'item
        if (itemType === 'skins') {
            user.equippedSkin = itemIndex;
        } else if (itemType === 'musics') {
            user.equippedMusic = itemIndex;
        }
        
        // Sauvegarder immédiatement
        this.saveAccounts();
        
        // Vérifier l'intégrité: que l'item est bien équipé ET possédé
        const isEquipped = itemType === 'skins' ? user.equippedSkin === itemIndex : user.equippedMusic === itemIndex;
        const isOwned = ownedList.includes(itemIndex);
        
        if (isEquipped && isOwned) {
            console.log(`✅✅ SYNCHRONISATION OK - ${itemType} #${itemIndex} équipé et possédé`);
        } else {
            console.error(`❌ ERREUR SYNC - ${itemType} #${itemIndex}: équipé=${isEquipped}, possédé=${isOwned}`);
        }
        
        return { success: true, isNew: true };
    }

    // ============ SYSTÈME DE SAUVEGARDE/RESTAURATION ============
    
    // Récupérer les données depuis le backup si le principal est corrompu
    recoverFromBackup() {
        const backup = localStorage.getItem('tetrisAccountsBackup');
        if (!backup) {
            console.error('❌ Aucun backup trouvé');
            return false;
        }
        
        try {
            this.accounts = JSON.parse(backup);
            localStorage.setItem('tetrisAccounts', backup);
            console.log('✅ Récupération depuis le backup réussie');
            return true;
        } catch (error) {
            console.error('❌ Erreur lors de la récupération du backup:', error);
            return false;
        }
    }
    
    // Exporter tous les comptes en fichier JSON
    exportAccounts() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `tetris-accounts-backup-${timestamp}.json`;
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            accounts: this.accounts,
            totalAccounts: Object.keys(this.accounts).length
        };
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(url);
        
        console.log(`✅ Sauvegarde exportée: ${filename}`);
        return { success: true, message: `Sauvegarde téléchargée: ${filename}` };
    }
    
    // Importer les comptes depuis un fichier JSON
    importAccounts(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            // Vérifier la structure du fichier
            if (!data.accounts || typeof data.accounts !== 'object') {
                return { success: false, message: 'Format de fichier invalide' };
            }
            
            // Fusionner ou remplacer les comptes
            const confirmMerge = confirm(
                `${Object.keys(data.accounts).length} compte(s) trouvé(s).\n\n` +
                'Fusionner avec les comptes existants? (Oui: fusion, Non: remplacer tous)'
            );
            
            if (confirmMerge) {
                // Fusionner: garder les comptes existants et ajouter les nouveaux
                this.accounts = { ...this.accounts, ...data.accounts };
            } else {
                // Remplacer: effacer tous les anciens comptes
                this.accounts = data.accounts;
            }
            
            this.saveAccounts();
            return { 
                success: true, 
                message: `Import réussi: ${Object.keys(data.accounts).length} compte(s) restauré(s)`,
                accountCount: Object.keys(data.accounts).length
            };
        } catch (error) {
            return { success: false, message: `Erreur lors de l'import: ${error.message}` };
        }
    }
    
    // Créer une sauvegarde automatique dans localStorage (backup additionnel)
    createAutoBackup() {
        const backup = {
            timestamp: new Date().toISOString(),
            accounts: this.accounts
        };
        localStorage.setItem('tetrisAutoBackup', JSON.stringify(backup));
        console.log('Sauvegarde automatique créée');
    }
    
    // Restaurer depuis la sauvegarde automatique
    restoreFromAutoBackup() {
        const backup = localStorage.getItem('tetrisAutoBackup');
        if (!backup) {
            return { success: false, message: 'Aucune sauvegarde automatique trouvée' };
        }
        
        const data = JSON.parse(backup);
        const confirmRestore = confirm(
            `Restaurer la sauvegarde du ${new Date(data.timestamp).toLocaleString()}?\n\n` +
            `${Object.keys(data.accounts).length} compte(s) seront restaurés.`
        );
        
        if (confirmRestore) {
            this.accounts = data.accounts;
            this.saveAccounts();
            return { success: true, message: 'Sauvegarde automatique restaurée' };
        }
        return { success: false, message: 'Restauration annulée' };
    }
    
    // Supprimer définitivement un compte
    deleteAccount(pseudo) {
        if (!this.accounts[pseudo]) {
            return { success: false, message: 'Compte non trouvé' };
        }
        
        const confirmDelete = confirm(
            `Êtes-vous sûr de vouloir supprimer le compte "${pseudo}"?\n\nCette action est irréversible!`
        );
        
        if (confirmDelete) {
            delete this.accounts[pseudo];
            this.saveAccounts();
            
            // Si c'est l'utilisateur connecté, le déconnecter
            if (this.currentUser === pseudo) {
                this.logout();
            }
            
            return { success: true, message: `Compte "${pseudo}" supprimé` };
        }
        return { success: false, message: 'Suppression annulée' };
    }
    
    // Obtenir des informations sur la sauvegarde
    getBackupInfo() {
        return {
            totalAccounts: Object.keys(this.accounts).length,
            accounts: Object.keys(this.accounts),
            lastSave: localStorage.getItem('tetrisLastSave') || 'Jamais',
            storageUsage: new Blob([JSON.stringify(this.accounts)]).size + ' bytes'
        };
    }
    
    // Fonction de DEBUG: vérifier l'état complet de la sauvegarde
    debugVerifyStorage() {
        console.log('═════════════════════════════════════════');
        console.log('🔍 VÉRIFICATION COMPLÈTE DU STOCKAGE');
        console.log('═════════════════════════════════════════');
        
        // Vérifier localStorage principal
        const localStorageData = localStorage.getItem('tetrisAccounts');
        console.log('📦 localStorage "tetrisAccounts":', localStorageData ? '✅ EXISTE' : '❌ VIDE');
        if (localStorageData) {
            try {
                const parsed = JSON.parse(localStorageData);
                console.log('   └─ Comptes trouvés:', Object.keys(parsed));
            } catch (e) {
                console.error('   └─ ❌ ERREUR PARSE:', e.message);
            }
        }
        
        // Vérifier localStorage backup
        const backupData = localStorage.getItem('tetrisAccountsBackup');
        console.log('📦 localStorage "tetrisAccountsBackup":', backupData ? '✅ EXISTE' : '❌ VIDE');
        if (backupData) {
            try {
                const parsed = JSON.parse(backupData);
                console.log('   └─ Comptes trouvés:', Object.keys(parsed));
            } catch (e) {
                console.error('   └─ ❌ ERREUR PARSE:', e.message);
            }
        }
        
        // Vérifier sessionStorage
        const sessionData = sessionStorage.getItem('tetrisAccountsSession');
        console.log('📦 sessionStorage "tetrisAccountsSession":', sessionData ? '✅ EXISTE' : '❌ VIDE');
        
        // Vérifier mémoire
        console.log('💾 Comptes en mémoire:', Object.keys(this.accounts));
        console.log('👤 Utilisateur actuel:', this.currentUser || '(aucun)');
        
        // Vérifier IndexedDB
        console.log('🗄️ IndexedDB: Vérification en cours...');
        const dbRequest = indexedDB.open('TetrisDB', 1);
        dbRequest.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['accounts'], 'readonly');
            const store = transaction.objectStore('accounts');
            const getRequest = store.get('data');
            getRequest.onsuccess = () => {
                console.log('🗄️ IndexedDB data:', getRequest.result ? '✅ EXISTE' : '❌ VIDE');
            };
        };
        
        console.log('═════════════════════════════════════════');
    }
}

// Instance globale - attacher à window pour être accessible partout
const accountSystem = new AccountSystem();
window.accountSystem = accountSystem;
console.log('✅ accountSystem attaché à window');
