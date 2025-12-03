// ============ SYSTÈME DE VERSION ============
let appVersion = '0.01'; // Version par défaut
let appChangelog = ''; // Changelog par défaut

// Charger la version depuis le fichier version.txt
fetch('version.txt')
    .then(response => response.text())
    .then(text => {
        appVersion = text.trim();
        console.log(`📦 Version actuelle: ${appVersion}`);
        
        // Mettre à jour l'affichage de la version dans le lobby
        const versionDisplay = document.getElementById('versionDisplay');
        if (versionDisplay) {
            versionDisplay.textContent = `v${appVersion}`;
        }
    })
    .catch(error => {
        console.warn('⚠️ Impossible de charger la version:', error);
        console.log(`📦 Utilisation de la version par défaut: ${appVersion}`);
    });

// Charger le changelog depuis le fichier changelog.txt
fetch('changelog.txt')
    .then(response => response.text())
    .then(text => {
        appChangelog = text.trim();
        console.log(`📝 Changelog chargé`);
    })
    .catch(error => {
        console.warn('⚠️ Impossible de charger le changelog:', error);
        appChangelog = 'Aucun changelog disponible';
    });

// Exporter les variables globalement
window.appVersion = appVersion;
window.appChangelog = appChangelog;

// ============ INITIALISATION PRINCIPALE ============
document.addEventListener('DOMContentLoaded', () => {
    // DEBUG: Vérifier l'état complet du stockage au démarrage
    console.log('🚀 Démarrage - Vérification du stockage...');
    accountSystem.debugVerifyStorage();
    
    // FORCE UPDATE DE TOUS LES COMPTES (appliquer les changements importants à tout le monde)
    console.log('🔄 Mise à jour des comptes...');
    const updatedCount = accountSystem.forceUpdateAllAccounts();
    
    // TEST XP SYSTEM (pour vérifier que les affichages sont corrects)
    console.log('🔍 Vérification du système XP:');
    console.log('   Niveau 1:', window.XpSystem.getXpRequiredForLevel(1), 'XP (doit être 0)');
    console.log('   Niveau 2:', window.XpSystem.getXpRequiredForLevel(2), 'XP (doit être 150)');
    console.log('   Niveau 3:', window.XpSystem.getXpRequiredForLevel(3), 'XP (doit être 500)');
    console.log('   Niveau 4:', window.XpSystem.getXpRequiredForLevel(4), 'XP (doit être 1200)');
    console.log('   Niveau 5:', window.XpSystem.getXpRequiredForLevel(5), 'XP (doit être 2000)');
    
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

    // Mobile visual override removed — use CSS media queries for mobile sizing

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
