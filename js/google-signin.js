// ============ GOOGLE SIGN-IN INTEGRATION ============

// Callback pour Google Sign-In
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
        
        // Créer un compte avec les données Google
        createGoogleAccount(payload);
        
    } catch (error) {
        console.error('❌ Erreur décodage token:', error);
    }
}

// Créer un compte automatique avec les données Google
function createGoogleAccount(googleData) {
    // Utiliser l'email comme pseudo (avant le @)
    const pseudo = googleData.email.split('@')[0];
    const code = googleData.sub; // Google User ID unique comme code
    
    console.log(`🎮 Création de compte: ${pseudo}`);
    
    // Créer le compte via le système de comptes existant
    const result = accountSystem.createAccount(pseudo, code);
    
    if (result.success) {
        console.log(`✅✅ Compte Google créé: ${pseudo}`);
        
        // Se connecter automatiquement
        const loginResult = accountSystem.login(pseudo, code);
        if (loginResult.success) {
            console.log(`✅ Connexion automatique réussie`);
            
            // Aller au lobby
            if (window.uiManager) {
                uiManager.showPage('lobbyPage');
                uiManager.updateLobbyDisplay();
                console.log('✅ Redirection au lobby');
            }
        }
    } else {
        console.warn(`⚠️ ${result.message}`);
        
        // Si le compte existe déjà, se connecter simplement
        if (result.message.includes('déjà')) {
            const loginResult = accountSystem.login(pseudo, code);
            if (loginResult.success) {
                console.log(`✅ Connexion réussie (compte existant)`);
                
                if (window.uiManager) {
                    uiManager.showPage('lobbyPage');
                    uiManager.updateLobbyDisplay();
                }
            }
        }
    }
}

// Exporter globalement
window.handleGoogleSignIn = handleGoogleSignIn;
window.createGoogleAccount = createGoogleAccount;

console.log('🔐 Google Sign-In module chargé');
