// ============ INTERFACE DE GESTION GITHUB BACKUP ============
// Ajoute les contrôles UI pour configurer et gérer les backups GitHub

class GitHubUI {
    constructor() {
        this.modalOpen = false;
    }

    // Créer le modal de configuration GitHub
    createGitHubModal() {
        if (document.getElementById('githubModal')) {
            return; // Déjà créé
        }

        const modal = document.createElement('div');
        modal.id = 'githubModal';
        modal.className = 'modal github-backup-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🔐 Sauvegarde GitHub</h2>
                    <button class="close-btn" id="closeGithubModal">&times;</button>
                </div>
                <div class="modal-body">
                    <p class="info-text">
                        Sauvegardez vos comptes directement sur GitHub pour une protection maximale!
                    </p>

                    <div id="githubStatus" class="github-status">
                        <div class="status-indicator" id="statusIndicator">❌ Non configuré</div>
                    </div>

                    <!-- Configuration du token -->
                    <div class="github-config" id="githubConfig">
                        <h3>Configuration</h3>
                        <p class="hint-text">
                            1. Allez sur <a href="https://github.com/settings/tokens" target="_blank">GitHub → Settings → Tokens</a><br>
                            2. Cliquez "Generate new token (classic)"<br>
                            3. Donnez-lui un nom: "Distrix Backup"<br>
                            4. Sélectionnez la permission: <strong>repo</strong> (accès complet aux repo)<br>
                            5. Cliquez "Generate" et copiez le token
                        </p>
                        
                        <label>GitHub Personal Token:</label>
                        <input type="password" id="githubTokenInput" placeholder="ghp_xxxxxxxxxxxx" maxlength="100">
                        <button id="saveTokenBtn" class="btn btn-primary">💾 Enregistrer le Token</button>
                        <button id="clearTokenBtn" class="btn btn-danger">🗑️ Effacer le Token</button>
                    </div>

                    <!-- Actions de backup -->
                    <div class="github-actions" id="githubActions" style="display: none;">
                        <h3>Actions</h3>
                        <button id="backupNowBtn" class="btn btn-primary" style="width: 100%; margin-bottom: 10px;">
                            📤 Sauvegarder Maintenant
                        </button>
                        <button id="restoreBtn" class="btn btn-secondary" style="width: 100%; margin-bottom: 10px;">
                            📥 Restaurer depuis GitHub
                        </button>
                        <button id="historyBtn" class="btn btn-secondary" style="width: 100%; margin-bottom: 10px;">
                            📋 Voir l'Historique
                        </button>
                    </div>

                    <!-- Historique des backups -->
                    <div id="backupHistory" class="backup-history" style="display: none; margin-top: 20px;">
                        <h3>Historique des Sauvegardes</h3>
                        <div id="historyList" class="history-list">
                            <p>Chargement...</p>
                        </div>
                    </div>

                    <!-- Logs -->
                    <div id="githubLogs" class="github-logs">
                        <h3>Logs</h3>
                        <div id="logOutput" class="log-output"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Attacher les événements
        this.attachEventListeners();
        this.updateStatus();
    }

    // Attacher les événements aux boutons
    attachEventListeners() {
        // Fermer le modal
        document.getElementById('closeGithubModal').addEventListener('click', () => {
            this.closeModal();
        });

        // Configurer le token
        document.getElementById('saveTokenBtn').addEventListener('click', () => {
            const token = document.getElementById('githubTokenInput').value.trim();
            if (token) {
                window.githubBackup.setGitHubToken(token);
                this.log('✅ Token GitHub configuré!');
                document.getElementById('githubTokenInput').value = '';
                this.updateStatus();
            } else {
                this.log('❌ Token vide');
            }
        });

        // Effacer le token
        document.getElementById('clearTokenBtn').addEventListener('click', () => {
            localStorage.removeItem('githubToken');
            window.githubBackup.githubToken = null;
            this.log('🗑️ Token GitHub effacé');
            this.updateStatus();
        });

        // Sauvegarder maintenant
        document.getElementById('backupNowBtn').addEventListener('click', async () => {
            this.log('📤 Sauvegarde en cours...');
            const accounts = window.accountSystem.accounts;
            const success = await window.githubBackup.backupAccountsToGitHub(accounts);
            if (success) {
                this.log('✅ Sauvegarde GitHub réussie!');
            } else {
                this.log('❌ Erreur lors de la sauvegarde');
            }
        });

        // Restaurer
        document.getElementById('restoreBtn').addEventListener('click', async () => {
            this.log('📥 Restauration en cours...');
            const accounts = await window.githubBackup.restoreAccountsFromGitHub();
            if (accounts) {
                window.accountSystem.accounts = accounts;
                window.accountSystem.saveAccounts();
                this.log('✅ Restauration réussie!');
            } else {
                this.log('❌ Impossible de restaurer - pas de backup trouvé');
            }
        });

        // Historique
        document.getElementById('historyBtn').addEventListener('click', async () => {
            await this.showHistory();
        });
    }

    // Afficher l'historique des backups
    async showHistory() {
        const historyDiv = document.getElementById('backupHistory');
        const historyList = document.getElementById('historyList');

        if (historyDiv.style.display === 'none') {
            this.log('📋 Chargement de l\'historique...');
            const history = await window.githubBackup.getBackupHistory();

            if (history && history.length > 0) {
                historyList.innerHTML = history
                    .map((commit, index) => `
                        <div class="history-item">
                            <div class="history-date">${commit.date}</div>
                            <div class="history-message">${commit.message}</div>
                            <div class="history-sha">SHA: ${commit.sha.substring(0, 7)}</div>
                        </div>
                    `)
                    .join('');
            } else {
                historyList.innerHTML = '<p>Aucun backup trouvé</p>';
            }

            historyDiv.style.display = 'block';
            this.log('✅ Historique chargé');
        } else {
            historyDiv.style.display = 'none';
        }
    }

    // Mettre à jour le statut
    updateStatus() {
        const statusIndicator = document.getElementById('statusIndicator');
        const githubConfig = document.getElementById('githubConfig');
        const githubActions = document.getElementById('githubActions');

        if (window.githubBackup && window.githubBackup.isConfigured()) {
            statusIndicator.innerHTML = '✅ Configuré et Prêt';
            statusIndicator.style.color = '#4CAF50';
            githubConfig.style.display = 'none';
            githubActions.style.display = 'block';
            this.log('✅ GitHub Backup est actif');
        } else {
            statusIndicator.innerHTML = '❌ Non configuré';
            statusIndicator.style.color = '#FF6B6B';
            githubConfig.style.display = 'block';
            githubActions.style.display = 'none';
            this.log('ℹ️ Entrez votre token GitHub pour activer');
        }
    }

    // Logger un message
    log(message) {
        const logOutput = document.getElementById('logOutput');
        if (logOutput) {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.textContent = `[${timestamp}] ${message}`;
            logOutput.appendChild(logEntry);
            logOutput.scrollTop = logOutput.scrollHeight; // Scroll au bas
        }
    }

    // Ouvrir le modal
    openModal() {
        this.createGitHubModal();
        const modal = document.getElementById('githubModal');
        modal.style.display = 'flex';
        this.modalOpen = true;
    }

    // Fermer le modal
    closeModal() {
        const modal = document.getElementById('githubModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.modalOpen = false;
    }
}

// Instance globale
const githubUI = new GitHubUI();
window.githubUI = githubUI;
