// ============ AUTHENTIFICATION GITHUB INVISBLE ============
// Système invisible de login GitHub + auto-backup

class GitHubAuth {
    constructor() {
        this.clientId = localStorage.getItem('githubClientId') || null;
        this.isAuthenticated = false;
        this.githubUser = null;
        this.githubToken = null;
        
        // Vérifier si on a un token en retour de GitHub
        this.checkOAuthCallback();
    }

    // ============ SETUP INITIAL (À faire une seule fois) ============
    // L'utilisateur doit créer une OAuth App sur GitHub une seule fois
    static setupOAuthApp(clientId, redirectUri) {
        localStorage.setItem('githubClientId', clientId);
        localStorage.setItem('githubRedirectUri', redirectUri);
        console.log('✅ GitHub OAuth configuré');
    }

    // ============ LOGIN AVEC GITHUB ============
    // Redirige l'utilisateur vers GitHub
    loginWithGitHub() {
        if (!this.clientId) {
            console.error('❌ GitHub OAuth non configuré');
            return false;
        }

        const redirectUri = localStorage.getItem('githubRedirectUri') || window.location.href;
        const scopes = 'user:email';
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${this.clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
        
        window.location.href = authUrl;
        return true;
    }

    // ============ VÉRIFIER LE CALLBACK OAUTH ============
    // Appelé quand GitHub redirige l'utilisateur
    checkOAuthCallback() {
        const code = new URLSearchParams(window.location.search).get('code');
        
        if (code) {
            console.log('🔐 Code OAuth reçu, échange en cours...');
            this.exchangeCodeForToken(code);
        }
    }

    // ============ ÉCHANGE LE CODE POUR UN TOKEN ============
    // C'est CRITIQUE: doit être fait côté serveur, pas en frontend!
    // Pour maintenant, on va utiliser un token manuel (passer par backend)
    async exchangeCodeForToken(code) {
        try {
            // Dans un vrai projet, ce endpoint serait sur TON serveur
            // qui ferait l'échange sécurisé
            const response = await fetch('/api/github/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            if (response.ok) {
                const data = await response.json();
                this.githubToken = data.access_token;
                this.githubUser = data.user;
                this.isAuthenticated = true;
                
                console.log('✅ Connecté avec GitHub:', this.githubUser.email);
                
                // TRÈS IMPORTANT: Créer le compte avec l'email GitHub
                // Créer un compte automatique si n'existe pas
                if (window.accountSystem && this.githubUser.email) {
                    const email = this.githubUser.email;
                    
                    // Vérifier si le compte existe déjà
                    if (!window.accountSystem.accounts[email]) {
                        // Créer un nouveau compte avec l'email comme pseudo
                        window.accountSystem.createAccount(email, email);
                        console.log(`✅ Compte créé avec email: ${email}`);
                    } else {
                        console.log(`ℹ️ Compte existant trouvé: ${email}`);
                    }
                    
                    // Se connecter avec l'email
                    const loginResult = window.accountSystem.login(email, email);
                    if (loginResult.success) {
                        console.log(`✅ Connecté en tant que: ${email}`);
                    }
                }
                
                // Récupérer les comptes depuis GitHub
                await this.loadAccountsFromGitHub();
                
                // Nettoyer l'URL
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Rediriger vers le lobby
                setTimeout(() => {
                    if (window.uiManager) {
                        window.uiManager.showPage('lobbyPage');
                    }
                }, 500);
            }
        } catch (error) {
            console.error('❌ Erreur OAuth:', error);
        }
    }

    // ============ SAUVEGARDER LES COMPTES SUR GITHUB (INVISBLE) ============
    async saveAccountsToGitHub(accounts) {
        if (!this.isAuthenticated || !this.githubToken) {
            return false; // Pas d'erreur, juste pas connected
        }

        try {
            console.log('💾 Sauvegarde GitHub invisible...');

            const backupData = {
                timestamp: new Date().toISOString(),
                version: window.appVersion || '0.03',
                userEmail: this.githubUser.email,  // Identifier par email
                accountCount: Object.keys(accounts).length,
                accounts: accounts
            };

            const content = btoa(unescape(encodeURIComponent(
                JSON.stringify(backupData, null, 2)
            )));

            // Chercher le SHA du fichier existant
            let sha = null;
            try {
                const response = await fetch(
                    `https://api.github.com/repos/${this.githubUser.login}/Distrix-Backup/contents/accounts.json`,
                    {
                        headers: {
                            'Authorization': `token ${this.githubToken}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    sha = data.sha;
                }
            } catch (e) {
                // Repo n'existe pas encore, ce n'est pas grave
            }

            // Créer le repo s'il n'existe pas (une seule fois)
            if (!sha) {
                await this.createBackupRepo();
            }

            // Pousser le backup
            const commitResponse = await fetch(
                `https://api.github.com/repos/${this.githubUser.login}/Distrix-Backup/contents/accounts.json`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.githubToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify({
                        message: `Auto-backup (${this.githubUser.email}): ${backupData.accountCount} compte(s) - ${new Date().toLocaleString()}`,
                        content: content,
                        sha: sha
                    })
                }
            );

            if (commitResponse.ok) {
                console.log('✅ Backup GitHub invisible réussi');
                return true;
            }

        } catch (error) {
            console.error('❌ Erreur backup GitHub:', error);
        }

        return false;
    }

    // ============ CHARGER LES COMPTES DEPUIS GITHUB (INVISIBLE) ============
    async loadAccountsFromGitHub() {
        if (!this.isAuthenticated || !this.githubToken) {
            return null;
        }

        try {
            console.log('📥 Chargement des comptes depuis GitHub...');

            const response = await fetch(
                `https://api.github.com/repos/${this.githubUser.login}/Distrix-Backup/contents/accounts.json`,
                {
                    headers: {
                        'Authorization': `token ${this.githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                const content = JSON.parse(
                    decodeURIComponent(escape(atob(data.content)))
                );

                console.log(`✅ ${content.accountCount} compte(s) chargés depuis GitHub`);
                return content.accounts;
            }

        } catch (error) {
            console.log('ℹ️ Pas de comptes sur GitHub (première connexion)');
        }

        return null;
    }

    // ============ CRÉER LE REPO DE BACKUP (AUTOMATIQUE) ============
    async createBackupRepo() {
        try {
            console.log('🏗️ Création du repo Distrix-Backup...');

            const response = await fetch('https://api.github.com/user/repos', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    name: 'Distrix-Backup',
                    description: 'Backup automatique des comptes Distrix',
                    private: true,
                    auto_init: true
                })
            });

            if (response.ok) {
                console.log('✅ Repo créé');
                return true;
            }

        } catch (error) {
            console.error('❌ Erreur création repo:', error);
        }

        return false;
    }

    // ============ LOGOUT ============
    logout() {
        this.isAuthenticated = false;
        this.githubToken = null;
        this.githubUser = null;
        localStorage.removeItem('githubToken');
        console.log('✅ Déconnexion GitHub');
    }
}

// Instance globale
const githubAuth = new GitHubAuth();
window.githubAuth = githubAuth;
