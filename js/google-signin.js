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
            // Passer aussi le token brut (response.credential) au handler
            createOrLoginGoogleAccount(decoded, token);
        });
        
    } catch (error) {
        console.error('❌ Erreur décodage token:', error);
        showLoginError('Erreur: impossible de décoder le token');
    }
}

// Créer ou connecter un compte automatiquement avec les données Google
function createOrLoginGoogleAccount(googleData, rawToken) {
    try {
        console.log('🎮 === DÉBUT CRÉATION/CONNEXION GOOGLE ===');
        
        const pseudo = googleData.email.split('@')[0];
        const code = googleData.sub;
        const email = googleData.email;
        // Prefer explicit rawToken passed from handleGoogleSignIn (contains the id_token)
        const token = rawToken || googleData.credential || googleData.id_token; // Token Google complet
        
        console.log(`   Email: ${email}`);
        console.log(`   Pseudo: ${pseudo}`);
        
        if (!window.accountSystem) throw new Error('accountSystem n\'est pas chargé');
        console.log('✅ accountSystem prêt');
        
        if (!window.uiManager) throw new Error('uiManager n\'est pas chargé');
        console.log('✅ uiManager prêt');
        
        // Étape 1: Vérifier le token avec le backend
        console.log('🔐 Vérification du token avec le serveur...');
        verifyGoogleTokenWithBackend(token, email, pseudo, code);
        
    } catch (error) {
        console.error('❌ ERREUR CRÉATION/CONNEXION:', error.message);
        showLoginError(`Erreur: ${error.message}`);
    }
}

// Vérifier le token Google avec le backend
async function verifyGoogleTokenWithBackend(token, email, pseudo, code) {
    try {
        const serverUrl = window.accountSystem.serverUrl;
        
        const response = await fetch(`${serverUrl}/api/auth/verify-google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });

        if (!response.ok) {
            const bodyText = await response.text().catch(() => null);
            console.error('❌ verifyGoogleTokenWithBackend non-ok response:', response.status, bodyText);
            throw new Error(`Erreur serveur: ${response.status}${bodyText ? ' - ' + bodyText : ''}`);
        }

        const data = await response.json();
        const maxRetries = 3;
        let attempt = 0;
        let lastError = null;

        while (attempt < maxRetries) {
            try {
                attempt++;
                const response = await fetch(`${serverUrl}/api/auth/verify-google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                if (!response.ok) {
                    const bodyText = await response.text().catch(() => null);
                    console.error('❌ verifyGoogleTokenWithBackend non-ok response:', response.status, bodyText);
                    throw new Error(`Erreur serveur: ${response.status}${bodyText ? ' - ' + bodyText : ''}`);
                }

                const data = await response.json();
                // success -> break loop
                lastError = null;
                // proceed with success handling below
                // set data to a temp var via closure
                verifyGoogleTokenWithBackend._lastData = data;
                break;
            } catch (err) {
                lastError = err;
                console.warn(`🔁 verify-google attempt ${attempt} failed:`, err.message);
                // small delay before retry
                await new Promise(r => setTimeout(r, 600 * attempt));
            }
        }

        if (lastError) {
            throw lastError;
        }
        
        if (!data.success) {
            throw new Error(data.message || 'Vérification échouée');
        }

        console.log('✅✅ Token vérifié et compte chargé du serveur');
        
        const serverAccount = data.account;
        
        // Mettre à jour l'email dans le système de comptes
        window.accountSystem.currentUserEmail = email;
        
        // Charger ou mettre à jour le compte localement
        window.accountSystem.accounts[pseudo] = serverAccount;
        window.accountSystem.currentUser = pseudo;
        window.accountSystem.saveCurrentSession();
        
        console.log('📦 Compte chargé depuis serveur, préparation connexion...');
        proceedWithLogin(pseudo, code, email);
        
    } catch (error) {
        console.error('❌ Erreur vérification backend:', error.message);
        // Fallback: créer le compte localement même si serveur indisponible
        console.log('⚠️ Fallback local (serveur indisponible)');
        showLoginError('Erreur vérification serveur: ' + (error.message || 'Erreur inconnue'));
        proceedWithLoginLocal(pseudo, code, email);
    }
}

// Procéder avec la connexion (version local fallback)
async function proceedWithLoginLocal(pseudo, code, email) {
    try {
        console.log('📝 Création de compte (mode local)...');
        const createResult = window.accountSystem.createAccount(pseudo, code);
        
        if (createResult.success) {
            console.log(`✅ Nouveau compte créé: ${pseudo}`);
            window.accountSystem.accounts[pseudo].email = email;
            window.accountSystem.accounts[pseudo].googleSub = code;
        } else {
            console.log(`ℹ️ Compte existe déjà: ${pseudo}`);
            if (!window.accountSystem.accounts[pseudo].email) {
                window.accountSystem.accounts[pseudo].email = email;
            }
        }
        
        window.accountSystem.currentUserEmail = email;
        
        // Connexion
        console.log('🔓 Connexion au compte...');
        const loginResult = window.accountSystem.login(pseudo, code);
        
        if (!loginResult.success) {
            throw new Error(`Connexion échouée: ${loginResult.message}`);
        }
        
        console.log(`✅✅ Connexion réussie: ${pseudo}`);
        
        // Redirection
        setTimeout(() => {
            console.log('📍 Redirection au lobby...');
            window.uiManager.showPage('lobbyPage');
            window.uiManager.updateLobbyDisplay();
            console.log('✅✅✅ REDIRECTION COMPLÈTE - Bienvenue!');
        }, 300);
    } catch (error) {
        console.error('❌ ERREUR:', error.message);
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
