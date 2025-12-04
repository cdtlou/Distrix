// ============ GOOGLE SIGN-IN INTEGRATION ============

// Callback pour Google Sign-In (one-tap ou button)
function handleGoogleSignIn(response) {
    console.log('🔐 Google Sign-In callback reçu');
    
    if (!response.credential) {
        console.error('❌ Pas de token Google');
        return;
    }

    // Décoder le JWT token (format: header.payload.signature)
    const token = response.credential;
    const parts = token.split('.');
    
    if (parts.length !== 3) {
        console.error('❌ Format de token invalide');
        return;
    }

    // Décoder le payload (partie 2)
    try {
        const payload = JSON.parse(atob(parts[1]));
        
        console.log('✅ Données Google reçues:');
        console.log('   - Email:', payload.email);
        console.log('   - Name:', payload.name);
        console.log('   - Picture:', payload.picture);
        console.log('   - Sub (ID):', payload.sub);
        
        // Créer/connecter le compte avec les données Google
        createOrLoginGoogleAccount(payload);
        
    } catch (error) {
        console.error('❌ Erreur décodage token:', error);
    }
}

// Créer ou connecter un compte automatiquement avec les données Google
function createOrLoginGoogleAccount(googleData) {
    // Utiliser l'email comme pseudo (avant le @)
    const pseudo = googleData.email.split('@')[0];
    const code = googleData.sub; // Google User ID unique comme code
    
    console.log(`🎮 Tentative de création/connexion: ${pseudo}`);
    
    // Créer le compte via le système de comptes existant
    const createResult = accountSystem.createAccount(pseudo, code);
    
    if (createResult.success) {
        console.log(`✅ Compte Google créé: ${pseudo}`);
    } else {
        console.log(`ℹ️ Compte existe déjà: ${pseudo}`);
    }
    
    // Toujours essayer de se connecter
    const loginResult = accountSystem.login(pseudo, code);
    
    if (loginResult.success) {
        console.log(`✅ Connexion réussie: ${pseudo}`);
        
        // Attendre que uiManager soit chargé (au cas où)
        if (window.uiManager) {
            uiManager.showPage('lobbyPage');
            uiManager.updateLobbyDisplay();
            console.log('✅ Redirection au lobby');
        } else {
            console.warn('⚠️ uiManager pas encore chargé, retry...');
            setTimeout(() => {
                if (window.uiManager) {
                    uiManager.showPage('lobbyPage');
                    uiManager.updateLobbyDisplay();
                }
            }, 500);
        }
    } else {
        console.error(`❌ Connexion échouée: ${loginResult.message}`);
        // Afficher l'erreur à l'utilisateur
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.textContent = `Erreur: ${loginResult.message}`;
        }
    }
}

// Exporter globalement
window.handleGoogleSignIn = handleGoogleSignIn;
window.createOrLoginGoogleAccount = createOrLoginGoogleAccount;

console.log('🔐 Google Sign-In module chargé');
