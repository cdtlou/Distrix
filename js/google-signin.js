// ============ GOOGLE SIGN-IN INTEGRATION ============

// Attendre que les systèmes clés soient chargés
function waitForSystems(callback, maxRetries = 200) {
    const hasAccountSystem = window.accountSystem && typeof window.accountSystem.login === 'function';
    const hasUIManager = window.uiManager && typeof window.uiManager.showPage === 'function';
    
    if (hasAccountSystem && hasUIManager) {
        console.log('✅ Tous les systèmes sont chargés et prêts!');
        callback();
    } else if (maxRetries > 0) {
        if (maxRetries % 40 === 0) {
            console.log(`⏳ Attente... AS:${hasAccountSystem} UI:${hasUIManager} (${200-maxRetries*25}ms)`);
        }
        setTimeout(() => waitForSystems(callback, maxRetries - 1), 25);
    } else {
        console.error('❌ Timeout: Les systèmes ne se sont pas chargés après 5s');
        console.error('   window.accountSystem:', typeof window.accountSystem);
        console.error('   window.uiManager:', typeof window.uiManager);
        console.error('   All window keys:', Object.keys(window).filter(k => !k.startsWith('webkit')).slice(0, 20));
        showLoginError('Erreur: Impossible de charger le jeu. Recharge la page.');
    }
}

// Callback pour Google Sign-In (one-tap ou button)
function handleGoogleSignIn(response) {
    console.log('🔐 Google Sign-In callback reçu');
    console.log('Response:', response);
    
    if (!response || !response.credential) {
        console.error('❌ Pas de token Google ou response invalide');
        showLoginError('Erreur: pas de réponse Google');
        return;
    }

    // Décoder le JWT token (format: header.payload.signature)
    const token = response.credential;
    const parts = token.split('.');
    
    if (parts.length !== 3) {
        console.error('❌ Format de token invalide');
        showLoginError('Erreur: format token invalide');
        return;
    }

    // Décoder le payload (partie 2)
    try {
        // Ajouter du padding si nécessaire pour base64
        let payload = parts[1];
        payload += '=='.substring(0, (4 - payload.length % 4) % 4);
        
        const decoded = JSON.parse(atob(payload));
        
        console.log('✅ Données Google décodées:');
        console.log('   - Email:', decoded.email);
        console.log('   - Name:', decoded.name);
        console.log('   - Sub (ID):', decoded.sub);
        
        // Attendre que les systèmes soient chargés, PUIS créer/connecter
        waitForSystems(() => {
            createOrLoginGoogleAccount(decoded);
        });
        
    } catch (error) {
        console.error('❌ Erreur décodage token:', error);
        showLoginError('Erreur: impossible de décoder le token');
    }
}

// Créer ou connecter un compte automatiquement avec les données Google
function createOrLoginGoogleAccount(googleData) {
    try {
        console.log('🎮 === DÉBUT CRÉATION/CONNEXION ===');
        
        // Utiliser l'email comme pseudo (avant le @)
        const pseudo = googleData.email.split('@')[0];
        const code = googleData.sub; // Google User ID unique comme code
        const email = googleData.email; // Email complet pour retrouver le compte
        
        console.log(`   Pseudo: ${pseudo}`);
        console.log(`   Email: ${email}`);
        console.log(`   Code: ${code}`);
        
        // Vérifier accountSystem
        if (!window.accountSystem) {
            throw new Error('accountSystem n\'est pas chargé');
        }
        console.log('✅ accountSystem prêt');
        
        // Vérifier uiManager
        if (!window.uiManager) {
            throw new Error('uiManager n\'est pas chargé');
        }
        console.log('✅ uiManager prêt');
        
        // Si localStorage a été effacé mais IndexedDB existe, restaurer le compte
        let accountRestoredFromIndexedDB = false;
        if (!window.accountSystem.accounts[pseudo]) {
            console.log(`📦 Recherche du compte dans IndexedDB pour: ${email}`);
            window.accountSystem.getAccountByEmailFromIndexedDB(email).then((restoredAccount) => {
                if (restoredAccount) {
                    console.log(`✅✅ Compte restauré depuis IndexedDB: ${pseudo}`);
                    window.accountSystem.accounts[pseudo] = restoredAccount;
                    window.accountSystem.currentUser = pseudo;
                    window.accountSystem.saveCurrentSession();
                    accountRestoredFromIndexedDB = true;
                    proceedWithLogin(pseudo, code, email);
                } else {
                    // Pas trouvé dans IndexedDB, créer nouveau compte
                    proceedWithLogin(pseudo, code, email);
                }
            });
            return;
        }
        
        // Compte trouvé en mémoire, procéder
        proceedWithLogin(pseudo, code, email);
        
    } catch (error) {
        console.error('❌ ERREUR CRÉATION/CONNEXION:', error.message);
        console.error('Stack:', error.stack);
        showLoginError(`Erreur: ${error.message}`);
    }
}

// Effectuer la création ou connexion du compte
function proceedWithLogin(pseudo, code, email) {
    try {
        // Créer le compte si n'existe pas
        console.log('📝 Création de compte...');
        const createResult = window.accountSystem.createAccount(pseudo, code);
        
        if (createResult.success) {
            console.log(`✅ Nouveau compte créé: ${pseudo}`);
            // Mettre à jour l'email Google dans le compte
            window.accountSystem.accounts[pseudo].email = email;
            window.accountSystem.accounts[pseudo].googleSub = code;
        } else {
            console.log(`ℹ️ Compte existe déjà: ${pseudo}`);
            // Mettre à jour l'email si pas encore défini
            if (!window.accountSystem.accounts[pseudo].email) {
                window.accountSystem.accounts[pseudo].email = email;
            }
        }
        
        // Connecter
        console.log('🔓 Connexion au compte...');
        const loginResult = window.accountSystem.login(pseudo, code);
        
        if (loginResult.success) {
            console.log(`✅✅ Connexion réussie: ${pseudo}`);
            
            // Attendre un peu et rediriger
            console.log('📍 Préparation redirection...');
            setTimeout(() => {
                console.log('📍 Redirection au lobby en cours...');
                window.uiManager.showPage('lobbyPage');
                window.uiManager.updateLobbyDisplay();
                console.log('✅✅✅ REDIRECTION COMPLÈTE - Bienvenue au jeu!');
            }, 300);
        } else {
            throw new Error(`Connexion échouée: ${loginResult.message}`);
        }
    } catch (error) {
        console.error('❌ ERREUR CRÉATION/CONNEXION:', error.message);
        console.error('Stack:', error.stack);
        showLoginError(`Erreur: ${error.message}`);
    }
}

// Afficher une erreur sur la page
function showLoginError(message) {
    console.error('🔴 ' + message);
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

// Exporter globalement
window.handleGoogleSignIn = handleGoogleSignIn;
window.createOrLoginGoogleAccount = createOrLoginGoogleAccount;
window.showLoginError = showLoginError;

console.log('🔐 Google Sign-In module chargé - Flow: One-Tap Direct');
