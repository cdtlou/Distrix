// ============ GOOGLE SIGN-IN INTEGRATION ============

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
        console.log('   - Picture:', decoded.picture);
        console.log('   - Sub (ID):', decoded.sub);
        
        // Créer/connecter le compte avec les données Google
        createOrLoginGoogleAccount(decoded);
        
    } catch (error) {
        console.error('❌ Erreur décodage token:', error);
        showLoginError('Erreur: impossible de décoder le token');
    }
}

// Créer ou connecter un compte automatiquement avec les données Google
function createOrLoginGoogleAccount(googleData) {
    try {
        // Utiliser l'email comme pseudo (avant le @)
        const pseudo = googleData.email.split('@')[0];
        const code = googleData.sub; // Google User ID unique comme code
        
        console.log(`🎮 Tentative de création/connexion: ${pseudo}`);
        
        // Attendre que accountSystem soit chargé
        if (!window.accountSystem) {
            console.warn('⚠️ accountSystem pas encore chargé, retry...');
            setTimeout(() => createOrLoginGoogleAccount(googleData), 500);
            return;
        }
        
        // Créer le compte via le système de comptes existant
        const createResult = window.accountSystem.createAccount(pseudo, code);
        
        if (createResult.success) {
            console.log(`✅ Nouveau compte Google créé: ${pseudo}`);
        } else {
            console.log(`ℹ️ Compte existe déjà: ${pseudo}`);
        }
        
        // Toujours essayer de se connecter
        const loginResult = window.accountSystem.login(pseudo, code);
        
        if (loginResult.success) {
            console.log(`✅ Connexion réussie: ${pseudo}`);
            
            // Attendre que uiManager soit chargé
            if (window.uiManager) {
                window.uiManager.showPage('lobbyPage');
                window.uiManager.updateLobbyDisplay();
                console.log('✅ Redirection au lobby');
            } else {
                console.warn('⚠️ uiManager pas encore chargé');
                setTimeout(() => {
                    if (window.uiManager) {
                        window.uiManager.showPage('lobbyPage');
                        window.uiManager.updateLobbyDisplay();
                    }
                }, 1000);
            }
        } else {
            console.error(`❌ Connexion échouée: ${loginResult.message}`);
            showLoginError(`Erreur connexion: ${loginResult.message}`);
        }
    } catch (error) {
        console.error('❌ Erreur dans createOrLoginGoogleAccount:', error);
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
