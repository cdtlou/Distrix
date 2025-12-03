// ============ INITIALISATION PRINCIPALE ============

// ============ SYSTÈME DE VERSIONING AUTOMATIQUE ============
class VersionSystem {
    constructor() {
        this.versionKey = 'tetrisGameVersion';
        this.currentVersion = this.loadVersion();
        this.updateVersionDisplay();
        // Incrémenter automatiquement à chaque page load (cache bypass)
        this.incrementVersion();
    }

    loadVersion() {
        const stored = localStorage.getItem(this.versionKey);
        return stored ? parseFloat(stored) : 0.01;
    }

    saveVersion() {
        localStorage.setItem(this.versionKey, this.currentVersion.toFixed(3));
    }

    incrementVersion() {
        this.currentVersion = parseFloat((this.currentVersion + 0.01).toFixed(3));
        this.saveVersion();
        this.updateVersionDisplay();
        console.log(`📦 Version mise à jour: ${this.currentVersion}`);
    }

    updateVersionDisplay() {
        const badge = document.getElementById('versionBadge');
        if (badge) {
            badge.textContent = `Mise à jour ${this.currentVersion.toFixed(2)}`;
        }
    }
}

// Initialiser le système de version
const versionSystem = new VersionSystem();

// Incrémenter la version au premier chargement (nouvelle session = nouvelle version)
// Cette fonction sera appelée après chaque changement majeur
function incrementGameVersion() {
    versionSystem.incrementVersion();
}

document.addEventListener('DOMContentLoaded', () => {
    // VÉRIFICATION DE SAUVEGARDES
    // Si les comptes principaux sont vides, essayer de récupérer depuis le backup
    if (Object.keys(accountSystem.accounts).length === 0) {
        const backup = localStorage.getItem('tetrisAccountsBackup');
        if (backup) {
            console.log('⚠️ Aucun compte trouvé. Récupération depuis le backup...');
            accountSystem.recoverFromBackup();
        }
    }

    // Backup UI removed — no setup required

    // Vérifier si un utilisateur est déjà connecté (en cas de rechargement)
    if (accountSystem.currentUser) {
        // Restaurer la session
        uiManager.showPage('lobbyPage');
        uiManager.updateLobbyDisplay();
        console.log(`✅ Session restaurée pour ${accountSystem.currentUser}`);
    } else {
        uiManager.showPage('loginPage');
    }

    // Initialiser les volumes du système audio
    const user = accountSystem.getCurrentUser();
    if (user && window.audioSystem) {
        audioSystem.setMusicVolume(user.musicVolume);
        audioSystem.setEffectsVolume(user.effectsVolume);
    }

    // Gérer le redimensionnement de la fenêtre
    window.addEventListener('resize', () => {
        // Adapter les contrôles mobiles
        const isMobile = window.innerWidth < 768;
        const mobileControls = document.querySelector('.mobile-controls');
        
        if (window.tetrisGame && window.tetrisGame.isRunning) {
            if (isMobile) {
                mobileControls.classList.add('active');
            } else {
                mobileControls.classList.remove('active');
            }
        }
    });

    // Afficher les contrôles mobiles si petit écran au démarrage
    if (window.innerWidth < 768) {
        document.querySelector('.mobile-controls').classList.remove('active');
    }

    console.log('🎮 District - Tetris Game initialized');
    console.log(`📊 Comptes en mémoire: ${Object.keys(accountSystem.accounts).length}`);

    // ============ DÉSACTIVER LE DÉFILEMENT SUR LA PAGE JEU ============
    const gamePage = document.getElementById('gamePage');
    
    // Bloquer la molette de la souris
    gamePage.addEventListener('wheel', (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, { passive: false });
    
    // Bloquer les touches de clavier qui causent le défilement
    gamePage.addEventListener('keydown', (e) => {
        const scrollKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'PageUp', 'PageDown', 'Home', 'End'];
        if (scrollKeys.includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, { passive: false });
    
    // Bloquer le défilement tactile
    gamePage.addEventListener('touchmove', (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, { passive: false });
});

// Sauvegarder les données avant de quitter
window.addEventListener('beforeunload', (e) => {
    // Sauvegarder une dernière fois
    if (accountSystem.currentUser) {
        accountSystem.saveAccounts();
        accountSystem.saveCurrentSession();
    }
    
    if (accountSystem.currentUser && window.tetrisGame && window.tetrisGame.isRunning) {
        e.preventDefault();
        e.returnValue = '';
    }
});
