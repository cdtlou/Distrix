// ============ SYSTÈME DE SYNCHRONISATION CLOUD ============
// Sauvegarde les comptes dans Firebase Firestore pour une sécurité maximale

class CloudSync {
    constructor() {
        this.isFirebaseReady = false;
        this.currentUserId = null;
        this.initFirebase();
    }

    // Initialiser Firebase
    async initFirebase() {
        try {
            // Charger Firebase SDK
            if (typeof firebase === 'undefined') {
                console.warn('⚠️ Firebase SDK non chargé - mode local uniquement');
                return;
            }

            // Initialiser Firebase avec la config
            if (!firebase.apps.length) {
                firebase.initializeApp(window.FIREBASE_CONFIG);
            }

            this.db = firebase.firestore();
            this.auth = firebase.auth();
            this.isFirebaseReady = true;

            console.log('✅ Firebase initialisé');

            // Écouter les changements d'authentification
            this.auth.onAuthStateChanged((user) => {
                if (user) {
                    this.currentUserId = user.uid;
                    console.log(`✅ Utilisateur connecté: ${user.email}`);
                } else {
                    this.currentUserId = null;
                    console.log('ℹ️ Utilisateur non authentifié (mode local)');
                }
            });
        } catch (error) {
            console.warn('⚠️ Erreur Firebase:', error.message);
            this.isFirebaseReady = false;
        }
    }

    // Sauvegarder un compte dans le cloud
    async saveAccountToCloud(pseudo, accountData) {
        if (!this.isFirebaseReady || !this.currentUserId) {
            console.log('ℹ️ Cloud sync désactivé - sauvegarde locale seulement');
            return false;
        }

        try {
            // Sauvegarder dans Firestore: /accounts/{userId}/{pseudo}
            await this.db
                .collection('accounts')
                .doc(this.currentUserId)
                .collection('userAccounts')
                .doc(pseudo)
                .set({
                    ...accountData,
                    lastSyncTime: new Date().toISOString(),
                    syncVersion: 1
                }, { merge: true });

            console.log(`📤 Compte ${pseudo} sauvegardé dans le cloud`);
            return true;
        } catch (error) {
            console.warn('⚠️ Erreur sauvegarde cloud:', error.message);
            return false;
        }
    }

    // Charger tous les comptes du cloud
    async loadAccountsFromCloud() {
        if (!this.isFirebaseReady || !this.currentUserId) {
            console.log('ℹ️ Cloud sync désactivé');
            return {};
        }

        try {
            const snapshot = await this.db
                .collection('accounts')
                .doc(this.currentUserId)
                .collection('userAccounts')
                .get();

            const accounts = {};
            snapshot.forEach((doc) => {
                accounts[doc.id] = doc.data();
            });

            console.log(`📥 ${Object.keys(accounts).length} compte(s) chargé(s) du cloud`);
            return accounts;
        } catch (error) {
            console.warn('⚠️ Erreur chargement cloud:', error.message);
            return {};
        }
    }

    // Récupérer un compte spécifique du cloud
    async getAccountFromCloud(pseudo) {
        if (!this.isFirebaseReady || !this.currentUserId) {
            return null;
        }

        try {
            const doc = await this.db
                .collection('accounts')
                .doc(this.currentUserId)
                .collection('userAccounts')
                .doc(pseudo)
                .get();

            if (doc.exists) {
                console.log(`📥 Compte ${pseudo} récupéré du cloud`);
                return doc.data();
            }

            return null;
        } catch (error) {
            console.warn('⚠️ Erreur récupération compte:', error.message);
            return null;
        }
    }

    // S'authentifier avec Google
    async signInWithGoogle() {
        if (!this.isFirebaseReady) {
            alert('⚠️ Firebase non disponible');
            return false;
        }

        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await this.auth.signInWithPopup(provider);
            console.log('✅ Authentification Google réussie');
            return true;
        } catch (error) {
            console.error('❌ Erreur authentification Google:', error.message);
            alert('Erreur authentification: ' + error.message);
            return false;
        }
    }

    // S'authentifier avec email/password
    async signInWithEmail(email, password) {
        if (!this.isFirebaseReady) {
            console.log('ℹ️ Firebase non disponible - mode local');
            return false;
        }

        try {
            await this.auth.signInWithEmailAndPassword(email, password);
            console.log('✅ Authentification email réussie');
            return true;
        } catch (error) {
            console.warn('⚠️ Erreur email:', error.message);
            return false;
        }
    }

    // Créer un compte email/password
    async createEmailAccount(email, password) {
        if (!this.isFirebaseReady) {
            console.log('ℹ️ Firebase non disponible - mode local');
            return false;
        }

        try {
            await this.auth.createUserWithEmailAndPassword(email, password);
            console.log('✅ Compte créé avec succès');
            return true;
        } catch (error) {
            console.warn('⚠️ Erreur création compte:', error.message);
            alert('Erreur: ' + error.message);
            return false;
        }
    }

    // Se déconnecter
    async signOut() {
        if (this.isFirebaseReady) {
            try {
                await this.auth.signOut();
                this.currentUserId = null;
                console.log('✅ Déconnexion réussie');
                return true;
            } catch (error) {
                console.warn('⚠️ Erreur déconnexion:', error.message);
                return false;
            }
        }
        return true;
    }

    // Obtenir l'utilisateur actuel
    getCurrentUser() {
        return this.auth ? this.auth.currentUser : null;
    }

    // Vérifier si un utilisateur est connecté
    isUserLoggedIn() {
        return this.currentUserId !== null;
    }
}

// Instance globale
const cloudSync = new CloudSync();
window.cloudSync = cloudSync;
