// ============ SYSTÈME DE COMPTES AVEC SYNCHRONISATION SERVEUR ============
class AccountSystem {
    constructor() {
        this.accounts = {};
        this.currentUser = null;
        // URL du serveur de synchronisation (par défaut en local)
        this.serverUrl = 'http://localhost:3000';
        
        // Charger les comptes depuis localStorage, backup, ou IndexedDB
        this.initializeStorage();
        
        // Sauvegarde automatique toutes les 5 secondes
        this.startAutoSave();
        // Synchronisation entre onglets/fenêtres (même PC/mobile)
        this.setupStorageSync();
        // Synchroniser avec le serveur au démarrage
        this.syncWithServer();
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
                localStorage.setItem('tetrisAccounts', JSON.stringify(this.accounts));
                if (this.currentUser) {
                    localStorage.setItem('tetrisCurrentUser', this.currentUser);
                }
                console.log('✅ Comptes restaurés depuis IndexedDB');
            } else {
                console.log('ℹ️ Aucunes données existantes trouvées');
                this.accounts = {};
                this.currentUser = null;
            }
            
            // Après avoir chargé les comptes, migrer les anciens pour être compatibles
            this.migrateOldAccounts();
        });
    }

    // ============ MIGRATION DES ANCIENS COMPTES ============
    migrateOldAccounts() {
        let hasMigrated = false;
        const migrationLog = [];

        for (const pseudo in this.accounts) {
            const account = this.accounts[pseudo];
            let accountChanged = false;

            // Vérifier si c'est un ancien compte (pas de version)
            if (!account.version) {
                account.version = 1;
                accountChanged = true;
                migrationLog.push(`➡️ ${pseudo}: Ajout version`);
            }

            // Recalculer le niveau selon le nouvel XP system (0→75000 sur 13 niveaux)
            if (window.XpSystem) {
                const newLevel = window.XpSystem.getLevelFromXP(account.xp);
                if (newLevel !== account.level) {
                    migrationLog.push(`➡️ ${pseudo}: Niveau ${account.level} → ${newLevel} (${account.xp} XP)`);
                    account.level = newLevel;
                    accountChanged = true;
                }
            }

            // Vérifier et mettre à jour ownedItems
            if (!account.ownedItems) {
                account.ownedItems = { skins: [0], musics: [0] };
                accountChanged = true;
                migrationLog.push(`➡️ ${pseudo}: Ajout ownedItems structure`);
            }

            // Vérifier les skins et musics
            if (account.ownedItems.skins && !Array.isArray(account.ownedItems.skins)) {
                account.ownedItems.skins = [0];
                accountChanged = true;
                migrationLog.push(`➡️ ${pseudo}: Réparation skins array`);
            }

            if (account.ownedItems.musics && !Array.isArray(account.ownedItems.musics)) {
                account.ownedItems.musics = [0];
                accountChanged = true;
                migrationLog.push(`➡️ ${pseudo}: Réparation musics array`);
            }

            // S'assurer qu'il y a toujours au moins l'item par défaut
            if (!account.ownedItems.skins.includes(0)) {
                account.ownedItems.skins.push(0);
                accountChanged = true;
                migrationLog.push(`➡️ ${pseudo}: Ajout skin par défaut`);
            }

            if (!account.ownedItems.musics.includes(0)) {
                account.ownedItems.musics.push(0);
                accountChanged = true;
                migrationLog.push(`➡️ ${pseudo}: Ajout musique par défaut`);
            }

            // Vérifier que equippedSkin/Music existent et sont valides
            if (account.equippedSkin === undefined) {
                account.equippedSkin = 0;
                accountChanged = true;
                migrationLog.push(`➡️ ${pseudo}: Ajout equippedSkin par défaut`);
            }

            if (account.equippedMusic === undefined) {
                account.equippedMusic = 0;
                accountChanged = true;
                migrationLog.push(`➡️ ${pseudo}: Ajout equippedMusic par défaut`);
            }

            // Vérifier que les items équipés sont bien possédés
            if (account.ownedItems.skins && !account.ownedItems.skins.includes(account.equippedSkin)) {
                account.equippedSkin = 0;
                accountChanged = true;
                migrationLog.push(`➡️ ${pseudo}: Reset equippedSkin à défaut (pas possédé)`);
            }

            if (account.ownedItems.musics && !account.ownedItems.musics.includes(account.equippedMusic)) {
                account.equippedMusic = 0;
                accountChanged = true;
                migrationLog.push(`➡️ ${pseudo}: Reset equippedMusic à défaut (pas possédé)`);
            }

            if (accountChanged) {
                hasMigrated = true;
            }
        }

        if (hasMigrated) {
            console.log('🔄 Migration des anciens comptes:');
            migrationLog.forEach(log => console.log(log));
            this.saveAccounts();
            console.log('✅ Migration complétée et sauvegardée');
        } else {
            console.log('ℹ️ Aucune migration nécessaire - tous les comptes sont à jour');
        }
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
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['accounts'], 'readwrite');
                const store = transaction.objectStore('accounts');
                store.put({
                    accounts: this.accounts,
                    currentUser: this.currentUser,
                    timestamp: new Date().toISOString()
                }, 'data');
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
        
        // Synchroniser avec le serveur en arrière-plan
        if (this.serverUrl) {
            this.syncToServer();
        }
    }

    // Synchroniser avec le serveur (charger les données du serveur)
    async syncWithServer() {
        if (!this.serverUrl) return;
        
        try {
            window.dispatchEvent(new CustomEvent('sync-status', { detail: 'syncing' }));
            
            const response = await fetch(`${this.serverUrl}/api/accounts`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Fusionner avec les données locales (les données du serveur prioritaires)
                    this.accounts = { ...this.accounts, ...data.accounts };
                    localStorage.setItem('tetrisAccounts', JSON.stringify(this.accounts));
                    console.log('🔄 Synchronisation avec serveur réussie');
                    window.dispatchEvent(new CustomEvent('sync-status', { detail: 'synced' }));
                }
            }
        } catch (error) {
            console.log('⚠️ Serveur indisponible - Mode local seulement');
            window.dispatchEvent(new CustomEvent('sync-status', { detail: 'error' }));
        }
    }

    // Envoyer les comptes au serveur
    async syncToServer() {
        try {
            const response = await fetch(`${this.serverUrl}/api/accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    accounts: this.accounts,
                    merge: true,
                    timestamp: new Date().toISOString()
                })
            });
            if (response.ok) {
                console.log('📤 Données synchronisées avec le serveur');
                window.dispatchEvent(new CustomEvent('sync-status', { detail: 'synced' }));
            }
        } catch (error) {
            // Silencieux - le serveur n'est peut-être pas disponible
            window.dispatchEvent(new CustomEvent('sync-status', { detail: 'error' }));
        }
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
        this.currentUser = null;
        this.saveCurrentSession();
        this.saveAccounts();
        console.log('✅ Déconnexion réussie');
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
    }

    updateBestScore(score) {
        if (!this.currentUser) return;
        
        const user = this.accounts[this.currentUser];
        if (score > user.bestScore) {
            user.bestScore = score;
            this.saveAccounts(); // Sauvegarde IMMÉDIATE
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

// Instance globale
const accountSystem = new AccountSystem();
