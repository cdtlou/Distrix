// ============ GOOGLE SIGN-IN INTEGRATION ============

// Attendre que les systèmes clés soient chargés
function waitForSystems(callback, maxRetries = 100) {
    const hasAccountSystem = window.accountSystem && typeof window.accountSystem.login === 'function';
    const hasUIManager = window.uiManager && typeof window.uiManager.showPage === 'function';
    
    if (hasAccountSystem && hasUIManager) {
        console.log('✅ Tous les systèmes sont chargés et prêts!');
        callback();
    } else if (maxRetries > 0) {
        if (maxRetries % 20 === 0) {
            console.log(`⏳ Attente systèmes... (${100 - maxRetries}ms, retry ${100 - maxRetries})`);
        }
        setTimeout(() => waitForSystems(callback, maxRetries - 1), 50);
    } else {
        console.error('❌ Timeout: Les systèmes ne se sont pas chargés après 5s');
        showLoginError('Erreur: Le jeu n\'a pas pu se charger complètement');
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
        console.log('🎮 Début du processus de création/connexion...');
        
        // Utiliser l'email comme pseudo (avant le @)
        const pseudo = googleData.email.split('@')[0];
        const code = googleData.sub; // Google User ID unique comme code
        
        console.log(`   Pseudo: ${pseudo}`);
        console.log(`   Code: ${code}`);
        
        // Double-vérifier que les systèmes sont chargés
        if (!window.accountSystem) {
            throw new Error('accountSystem n\'est pas chargé');
        }
        if (!window.uiManager) {
            throw new Error('uiManager n\'est pas chargé');
        }
        
        console.log('✅ Systèmes vérifiés');
        
        // Créer le compte via le système de comptes existant
        console.log('📝 Tentative de création de compte...');
        const createResult = window.accountSystem.createAccount(pseudo, code);
        
        if (createResult.success) {
            console.log(`✅ Nouveau compte créé: ${pseudo}`);
        } else {
            console.log(`ℹ️ Compte existe déjà: ${pseudo}`);
        }
        
        // Toujours essayer de se connecter
        console.log('🔓 Tentative de connexion...');
        const loginResult = window.accountSystem.login(pseudo, code);
        
        if (loginResult.success) {
            console.log(`✅✅ Connexion réussie: ${pseudo}`);
            
            // Petit délai pour s'assurer que le compte est bien sauvegardé
            setTimeout(() => {
                console.log('📍 Redirection au lobby...');
                window.uiManager.showPage('lobbyPage');
                window.uiManager.updateLobbyDisplay();
                console.log('✅ Redirection complète - Bienvenue au lobby!');
            }, 200);
        } else {
            console.error(`❌ Connexion échouée: ${loginResult.message}`);
            showLoginError(`Erreur de connexion: ${loginResult.message}`);
        }
    } catch (error) {
        console.error('❌ Erreur dans createOrLoginGoogleAccount:', error.message);
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
