// ============ SYSTÈME DE BACKUP SUR GITHUB ============
// Sauvegarde tous les comptes sur GitHub de façon sécurisée

class GitHubBackup {
    constructor() {
        // Token GitHub (à configurer)
        // IMPORTANT: Créer un token personnel sur https://github.com/settings/tokens
        this.githubToken = localStorage.getItem('githubToken') || null;
        this.repoOwner = 'cdtlou'; // À remplacer par ton username
        this.repoName = 'Distrix'; // À remplacer par ton repo
        this.backupFilePath = 'backups/accounts-backup.json';
        this.lastBackupTime = localStorage.getItem('lastBackupTime') || null;
    }

    // Définir le token GitHub
    setGitHubToken(token) {
        this.githubToken = token;
        localStorage.setItem('githubToken', token);
        console.log('✅ GitHub token configuré');
    }

    // Vérifier si le token est configuré
    isConfigured() {
        return this.githubToken !== null && this.githubToken !== '';
    }

    // Sauvegarder les comptes sur GitHub
    async backupAccountsToGitHub(accounts) {
        if (!this.isConfigured()) {
            console.warn('⚠️ GitHub token non configuré');
            return false;
        }

        try {
            console.log('📤 Sauvegarde sur GitHub en cours...');

            const backupData = {
                timestamp: new Date().toISOString(),
                version: window.appVersion || '0.03',
                accountCount: Object.keys(accounts).length,
                accounts: accounts
            };

            // Convertir en base64
            const content = btoa(unescape(encodeURIComponent(
                JSON.stringify(backupData, null, 2)
            )));

            // Chercher le SHA du fichier existant
            let sha = null;
            try {
                const response = await fetch(
                    `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.backupFilePath}`,
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
                // Fichier n'existe pas encore, ce n'est pas grave
            }

            // Pousser le backup
            const commitResponse = await fetch(
                `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.backupFilePath}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.githubToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify({
                        message: `Backup: ${backupData.accountCount} compte(s) - ${new Date().toLocaleString()}`,
                        content: content,
                        sha: sha
                    })
                }
            );

            if (commitResponse.ok) {
                console.log('✅ Backup GitHub réussi');
                this.lastBackupTime = new Date().toISOString();
                localStorage.setItem('lastBackupTime', this.lastBackupTime);
                return true;
            } else {
                const error = await commitResponse.json();
                console.error('❌ Erreur GitHub:', error.message);
                return false;
            }

        } catch (error) {
            console.error('❌ Erreur sauvegarde GitHub:', error);
            return false;
        }
    }

    // Charger les comptes depuis GitHub
    async restoreAccountsFromGitHub() {
        if (!this.isConfigured()) {
            console.warn('⚠️ GitHub token non configuré');
            return null;
        }

        try {
            console.log('📥 Restauration depuis GitHub...');

            const response = await fetch(
                `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.backupFilePath}`,
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

                console.log(`✅ Backup restauré: ${content.accountCount} compte(s)`);
                return content.accounts;
            } else {
                console.warn('⚠️ Pas de backup trouvé sur GitHub');
                return null;
            }

        } catch (error) {
            console.error('❌ Erreur restauration GitHub:', error);
            return null;
        }
    }

    // Afficher l'historique des backups
    async getBackupHistory() {
        if (!this.isConfigured()) {
            return null;
        }

        try {
            const response = await fetch(
                `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/commits?path=${this.backupFilePath}&per_page=10`,
                {
                    headers: {
                        'Authorization': `token ${this.githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (response.ok) {
                const commits = await response.json();
                return commits.map(c => ({
                    date: new Date(c.commit.committer.date).toLocaleString(),
                    message: c.commit.message,
                    sha: c.sha
                }));
            }

            return null;
        } catch (error) {
            console.error('❌ Erreur historique:', error);
            return null;
        }
    }

    // Obtenir le dernier backup
    async getLastBackup() {
        if (!this.isConfigured()) {
            return null;
        }

        try {
            const response = await fetch(
                `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.backupFilePath}`,
                {
                    headers: {
                        'Authorization': `token ${this.githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                return {
                    updatedAt: data.commit.committer.date,
                    url: data.html_url
                };
            }

            return null;
        } catch (error) {
            console.error('❌ Erreur backup info:', error);
            return null;
        }
    }
}

// Instance globale
const githubBackup = new GitHubBackup();
window.githubBackup = githubBackup;
