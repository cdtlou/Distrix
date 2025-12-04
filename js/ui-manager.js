// ============ GESTIONNAIRE D'INTERFACE UTILISATEUR ============
class UIManager {
    constructor() {
        this.currentPage = 'loginPage';
        this.setupEventListeners();
        // Sync indicator visual removed — no-op kept for compatibility
        this.setupSyncIndicator();
    }

    setupSyncIndicator() {
        // No-op: visual sync indicator removed. Keep method to avoid breaking callers.
        return;
    }

    updateSyncStatus(status) {
        // No-op: visual sync indicator removed. Function retained for compatibility.
        return;
    }

    setupEventListeners() {
        // LOGIN PAGE - Les boutons peuvent ne pas exister si on utilise Google-only
        const createBtn = document.getElementById('createBtn');
        const loginBtn = document.getElementById('loginBtn');
        const pseudoInput = document.getElementById('pseudoInput');
        const codeInput = document.getElementById('codeInput');
        
        if (createBtn) createBtn.addEventListener('click', () => this.createAccount());
        if (loginBtn) loginBtn.addEventListener('click', () => this.login());
        
        // Permettre la connexion avec Entrée
        if (pseudoInput) pseudoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
        if (codeInput) codeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });

        // LOBBY PAGE
        document.getElementById('settingsBtn').addEventListener('click', () => this.showPage('settingsPage'));
        document.getElementById('playBtn').addEventListener('click', () => this.startGame());
        document.getElementById('shopBtn').addEventListener('click', () => this.showPage('shopPage'));
        document.getElementById('casierBtn').addEventListener('click', () => this.showPage('casierPage'));

        // LOGOUT BUTTON (dans les paramètres)
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // SETTINGS PAGE
        document.getElementById('closeSettingsBtn').addEventListener('click', () => this.showPage('lobbyPage'));
        document.getElementById('musicVolume').addEventListener('change', (e) => {
            accountSystem.updateVolume('music', e.target.value);
            document.getElementById('musicVolumeValue').textContent = e.target.value + '%';
            // Mettre à jour le volume du système audio
            if (window.audioSystem) {
                audioSystem.setMusicVolume(e.target.value);
            }
        });
        document.getElementById('effectsVolume').addEventListener('change', (e) => {
            accountSystem.updateVolume('effects', e.target.value);
            document.getElementById('effectsVolumeValue').textContent = e.target.value + '%';
            // Mettre à jour le volume des effets
            if (window.audioSystem) {
                audioSystem.setEffectsVolume(e.target.value);
            }
        });
        // Remap keys UI removed — remapping still available via console if needed

        // SHOP PAGE
        document.getElementById('closeShopBtn').addEventListener('click', () => this.showPage('lobbyPage'));

        // CASIER PAGE
        document.getElementById('closeCasierBtn').addEventListener('click', () => this.showPage('lobbyPage'));

        // VERSION DISPLAY (clicker pour voir le changelog)
        const versionDisplay = document.getElementById('versionDisplay');
        if (versionDisplay) {
            versionDisplay.style.cursor = 'pointer';
            versionDisplay.addEventListener('click', () => this.showChangelog());
        }

        // GAME PAGE
        document.getElementById('pauseBtn').addEventListener('click', () => this.toggleGamePause());
        document.getElementById('exitGameBtn').addEventListener('click', () => this.exitGame());
        
        // Desktop buttons (if they exist)
        const pauseBtnDesktop = document.getElementById('pauseBtn-desktop');
        if (pauseBtnDesktop) pauseBtnDesktop.addEventListener('click', () => this.toggleGamePause());
        const exitGameBtnDesktop = document.getElementById('exitGameBtn-desktop');
        if (exitGameBtnDesktop) exitGameBtnDesktop.addEventListener('click', () => this.exitGame());
    }

    showPage(pageName) {
        // Masquer la page actuelle
        document.getElementById(this.currentPage).classList.remove('active');
        
        // Afficher la nouvelle page
        document.getElementById(pageName).classList.add('active');
        this.currentPage = pageName;

        // Actions supplémentaires selon la page
        if (pageName === 'lobbyPage') this.updateLobbyDisplay();
        if (pageName === 'shopPage') this.displayShop();
        if (pageName === 'casierPage') this.displayCasier();
        if (pageName === 'settingsPage') this.updateSettingsDisplay();
    }

    createAccount() {
        const pseudo = document.getElementById('pseudoInput').value.trim();
        const code = document.getElementById('codeInput').value.trim();

        if (!pseudo || !code) {
            this.showError('Veuillez remplir tous les champs');
            return;
        }

        if (pseudo.length < 3) {
            this.showError('Le pseudo doit faire au moins 3 caractères');
            return;
        }

        const result = accountSystem.createAccount(pseudo, code);
        if (result.success) {
            this.showError(''); // Effacer les erreurs
            document.getElementById('pseudoInput').value = '';
            document.getElementById('codeInput').value = '';
            
            // Vérifier 2x que le compte a bien été créé
            setTimeout(() => {
                if (accountSystem.accounts[pseudo]) {
                    this.showError('✅ Compte créé et sauvegardé! Vous pouvez maintenant vous connecter.', 'success');
                } else {
                    this.showError('⚠️ ERREUR: Le compte n\'a pas pu être sauvegardé!', 'error');
                }
            }, 500);
        } else {
            this.showError(result.message);
        }
    }

    login() {
        const pseudo = document.getElementById('pseudoInput').value.trim();
        const code = document.getElementById('codeInput').value.trim();

        if (!pseudo || !code) {
            this.showError('Veuillez remplir tous les champs');
            return;
        }

        const result = accountSystem.login(pseudo, code);
        if (result.success) {
            this.showError('');
            document.getElementById('pseudoInput').value = '';
            document.getElementById('codeInput').value = '';
            
            // Vérifier que l'utilisateur est bien connecté
            setTimeout(() => {
                this.showPage('lobbyPage');
            }, 300);
        } else {
            this.showError(result.message);
        }
    }

    logout() {
        accountSystem.logout();
        document.getElementById('pseudoInput').value = '';
        document.getElementById('codeInput').value = '';
        // Retourner à la page de connexion
        this.showPage('loginPage');

        // Effacer les messages d'erreur éventuels
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.style.display = 'none';
        }

        // Si Google Identity est présent, demander à afficher le sélecteur
        try {
            if (window.google && window.google.accounts && window.google.accounts.id) {
                // Empêcher la sélection automatique du compte précédemment utilisé
                if (typeof window.google.accounts.id.disableAutoSelect === 'function') {
                    window.google.accounts.id.disableAutoSelect();
                }

                // Provoquer l'affichage du sélecteur/one-tap pour choisir un compte
                if (typeof window.google.accounts.id.prompt === 'function') {
                    window.google.accounts.id.prompt();
                }
            }
        } catch (err) {
            console.warn('⚠️ Impossible d'appeler Google Identity API lors de la déconnexion:', err);
        }
    }

    showError(message, type = 'error') {
        const errorDiv = document.getElementById('loginError');
        errorDiv.textContent = message;
        errorDiv.style.color = type === 'success' ? '#4caf50' : '#ff6b6b';
    }

    updateLobbyDisplay() {
        const user = accountSystem.getCurrentUser();
        if (!user) return;

        document.getElementById('lobbyUsername').textContent = user.pseudo;
        document.getElementById('lobbyLevel').textContent = user.level;
        
        // Obtenir la progression XP pour le prochain niveau
        const xpProgress = XpSystem.getXpProgressForLevel(user.xp);
        
        // Afficher: XP actuel total / XP total nécessaire pour PROCHAIN niveau
        const nextLevelXpRequired = XpSystem.getXpRequiredForLevel(xpProgress.nextLevel);
        
        document.getElementById('lobbyXP').textContent = user.xp;
        document.getElementById('lobbyXPRequired').textContent = nextLevelXpRequired;

        // Barre de progression (s'assurer de ne pas diviser par 0)
        const percentage = xpProgress.percentage;
        document.getElementById('lobbyXPFill').style.width = Math.max(0, Math.min(100, percentage)) + '%';

        // Record
        document.getElementById('playerRecord').textContent = user.bestScore;

        // Afficher le top 3
        const topScores = accountSystem.getTopScores(3);
        const topList = document.getElementById('topPlayers');
        topList.innerHTML = '';
        
        if (topScores.length === 0) {
            topList.innerHTML = '<li>-</li><li>-</li><li>-</li>';
        } else {
            topScores.forEach((score, index) => {
                const li = document.createElement('li');
                li.textContent = `${score.pseudo}: ${score.score}`;
                topList.appendChild(li);
            });
            
            // Ajouter des tirets si moins de 3
            while (topList.children.length < 3) {
                const li = document.createElement('li');
                li.textContent = '-';
                topList.appendChild(li);
            }
        }
    }

    displayShop() {
        const user = accountSystem.getCurrentUser();
        if (!user) return;

        console.log('UIManager.displayShop - ShopSystem.musics =', window.ShopSystem && window.ShopSystem.musics);

        // Afficher les skins
        const skinsList = document.getElementById('skinsList');
        skinsList.innerHTML = '';
        
        ShopSystem.skins.forEach(skin => {
            const div = document.createElement('div');
            div.className = 'shop-item';
            
            const isUnlocked = ShopSystem.isItemUnlocked('skins', skin.id, user.level);
            const isOwned = accountSystem.isItemOwned('skins', skin.id);
            const xpRequired = ShopSystem.getXpRequiredForItem('skins', skin.id);
            
            if (!isUnlocked) {
                div.classList.add('locked');
            }

            // Afficher un carré avec la couleur du skin
            const colorSquare = `<div class="color-square" style="background-color: ${skin.color}; width: 60px; height: 60px; border-radius: 8px; margin: 0 auto 10px; border: 2px solid rgba(255, 255, 255, 0.3);"></div>`;

            div.innerHTML = `
                ${colorSquare}
                <div class="shop-item-name">${skin.name}</div>
                <div class="shop-item-level">Niveau ${skin.level}</div>
                <div class="shop-item-xp" style="font-size: 12px; color: #ffd700; margin-bottom: 8px;">XP: ${xpRequired.toLocaleString()}</div>
                <button class="shop-item-button" ${!isUnlocked ? 'disabled' : ''}
                        onclick="uiManager.buySkin(${skin.id})">
                    ${isOwned ? '✓ Possédé' : 'Débloquer'}
                </button>
            `;
            
            skinsList.appendChild(div);
        });

        // Afficher les musiques
        const musicsList = document.getElementById('musicsList');
        musicsList.innerHTML = '';
        
        ShopSystem.musics.forEach(music => {
            const div = document.createElement('div');
            div.className = 'shop-item';
            
            const isUnlocked = ShopSystem.isItemUnlocked('musics', music.id, user.level);
            const isOwned = accountSystem.isItemOwned('musics', music.id);
            const xpRequired = ShopSystem.getXpRequiredForItem('musics', music.id);
            
            if (!isUnlocked) {
                div.classList.add('locked');
            }

            div.innerHTML = `
                <div class="shop-item-name">${music.emoji} ${music.name}</div>
                <div class="shop-item-level">Niveau ${music.level}</div>
                <div class="shop-item-xp" style="font-size: 12px; color: #ffd700; margin-bottom: 8px;">XP: ${xpRequired.toLocaleString()}</div>
                <button class="shop-item-button" ${!isUnlocked ? 'disabled' : ''}
                        onclick="uiManager.buyMusic(${music.id})">
                    ${isOwned ? '✓ Possédé' : 'Débloquer'}
                </button>
            `;
            
            musicsList.appendChild(div);
        });
    }

    buySkin(skinId) {
        const user = accountSystem.getCurrentUser();
        if (!user) return;

        const skin = ShopSystem.skins.find(s => s.id === skinId);
        
        if (!ShopSystem.isItemUnlocked('skins', skinId, user.level)) {
            alert(`Débloqué au niveau ${skin.level}`);
            return;
        }

        if (accountSystem.isItemOwned('skins', skinId)) {
            alert('Vous possédez déjà cet objet');
            return;
        }

        accountSystem.buyItem('skins', skinId);
        // Équiper automatiquement le nouveau skin avec synchronisation robuste
        accountSystem.syncEquipmentChange('skins', skinId);
        alert('Skin débloqué et équipé!');
        this.displayShop();
        this.displayCasier();
    }

    buyMusic(musicId) {
        const user = accountSystem.getCurrentUser();
        if (!user) return;

        const music = ShopSystem.musics.find(m => m.id === musicId);
        
        if (!ShopSystem.isItemUnlocked('musics', musicId, user.level)) {
            alert(`Débloqué au niveau ${music.level}`);
            return;
        }

        if (accountSystem.isItemOwned('musics', musicId)) {
            alert('Vous possédez déjà cet objet');
            return;
        }

        accountSystem.buyItem('musics', musicId);
        // Équiper automatiquement la nouvelle musique avec synchronisation robuste
        accountSystem.syncEquipmentChange('musics', musicId);
        alert('Musique débloquée et équipée!');
        this.displayShop();
        this.displayCasier();
    }

    displayCasier() {
        const user = accountSystem.getCurrentUser();
        if (!user) return;

        // Skins
        const skinsWardrobe = document.getElementById('skinsWardrobe');
        skinsWardrobe.innerHTML = '';
        
        ShopSystem.skins.forEach(skin => {
            const isOwned = accountSystem.isItemOwned('skins', skin.id);
            
            // Ne montrer que les skins possédés
            if (!isOwned) return;

            const div = document.createElement('div');
            div.className = 'wardrobe-item';
            
            const isEquipped = user.equippedSkin === skin.id;
            
            if (isEquipped) {
                div.classList.add('equipped');
            }

            const colorSquare = `<div class="color-square" style="background-color: ${skin.color}; width: 60px; height: 60px; border-radius: 8px; margin: 0 auto 10px; border: 2px solid rgba(255, 255, 255, 0.3);"></div>`;

            div.innerHTML = `
                ${colorSquare}
                <div class="wardrobe-item-name">${skin.name}</div>
                <button class="wardrobe-item-button" onclick="uiManager.equipSkin(${skin.id})">
                    ${isEquipped ? '✓ Équipé' : 'Équiper'}
                </button>
            `;
            
            skinsWardrobe.appendChild(div);
        });

        // Afficher un message si aucun skin
        if (skinsWardrobe.innerHTML === '') {
            skinsWardrobe.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">Aucun skin débloqué</p>';
        }

        // Musiques
        const musicsWardrobe = document.getElementById('musicsWardrobe');
        musicsWardrobe.innerHTML = '';
        
        ShopSystem.musics.forEach(music => {
            const isOwned = accountSystem.isItemOwned('musics', music.id);
            
            // Ne montrer que les musiques possédées
            if (!isOwned) return;

            const div = document.createElement('div');
            div.className = 'wardrobe-item';
            
            const isEquipped = user.equippedMusic === music.id;
            
            if (isEquipped) {
                div.classList.add('equipped');
            }

            // Déterminer la couleur basée sur le nom
            const colorMap = {
                'Rhythm': '#FF8800',
                'Groove': '#00DD00',
                'Wave': '#0099FF',
                'Cosmic': '#DD00FF'
            };
            const musicColor = colorMap[music.name] || '#888888';
            const colorSquare = `<div class="color-square" style="background-color: ${musicColor}; width: 60px; height: 60px; border-radius: 8px; margin: 0 auto 10px; border: 2px solid rgba(255, 255, 255, 0.3);"></div>`;

            div.innerHTML = `
                ${colorSquare}
                <div class="wardrobe-item-name">${music.emoji} ${music.name}</div>
                <button class="wardrobe-item-button" onclick="uiManager.equipMusic(${music.id})">
                    ${isEquipped ? '✓ Équipé' : 'Équiper'}
                </button>
            `;
            
            musicsWardrobe.appendChild(div);
        });

        // Afficher un message si aucune musique
        if (musicsWardrobe.innerHTML === '') {
            musicsWardrobe.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">Aucune musique débloquée</p>';
        }
    }

    equipSkin(skinId) {
        accountSystem.syncEquipmentChange('skins', skinId);
        this.displayCasier();
    }

    equipMusic(musicId) {
        accountSystem.syncEquipmentChange('musics', musicId);
        this.displayCasier();
    }

    updateSettingsDisplay() {
        const user = accountSystem.getCurrentUser();
        if (!user) return;

        document.getElementById('musicVolume').value = user.musicVolume;
        document.getElementById('musicVolumeValue').textContent = user.musicVolume + '%';
        document.getElementById('effectsVolume').value = user.effectsVolume;
        document.getElementById('effectsVolumeValue').textContent = user.effectsVolume + '%';

        // PC key labels removed from UI — update only if elements exist (kept safe)
        const el = id => document.getElementById(id);
        const kLeft = el('keyLeft'); if (kLeft) kLeft.textContent = user.controls.left.toUpperCase();
        const kRight = el('keyRight'); if (kRight) kRight.textContent = user.controls.right.toUpperCase();
        const kRotate = el('keyRotate'); if (kRotate) kRotate.textContent = user.controls.rotate.toUpperCase();
        const kDown = el('keyDown'); if (kDown) kDown.textContent = user.controls.down.toUpperCase();
        const kHard = el('keyHardDrop'); if (kHard) kHard.textContent = (user.controls.hardDrop === ' ' ? 'Space' : user.controls.hardDrop.toUpperCase());
    }

    startRemappingKeys() {
        const keys = ['left', 'right', 'rotate', 'down', 'hardDrop'];
        const keyLabels = {
            'left': '← Gauche',
            'right': '→ Droite',
            'rotate': '↻ Rotation',
            'down': '↓ Descente',
            'hardDrop': '⬇️ Hard Drop'
        };

        const remappedKeys = {};
        let currentKeyIndex = 0;

        const promptKey = () => {
            if (currentKeyIndex >= keys.length) {
                // Remapping terminé
                accountSystem.updateControls(remappedKeys);
                this.updateSettingsDisplay();
                alert('Touches remappées avec succès!');
                return;
            }

            const keyName = keys[currentKeyIndex];
            const label = keyLabels[keyName];

            const response = prompt(`Appuyez sur la touche pour: ${label}\n\n(Tapez le caractère ou "space" pour la barre d'espace)`);
            
            if (response === null) {
                alert('Remapping annulé');
                return;
            }

            const key = response.toLowerCase().trim();
            if (key === 'space' || key === '') {
                remappedKeys[keyName] = ' ';
            } else if (key.length === 1) {
                remappedKeys[keyName] = key;
            } else {
                alert('Entrée invalide. Tapez un seul caractère.');
                return;
            }

            currentKeyIndex++;
            promptKey();
        };

        promptKey();
    }

    startGame() {
        this.showPage('gamePage');
        
        // Request fullscreen to hide browser UI
        const gamePage = document.getElementById('gamePage');
        if (gamePage.requestFullscreen) {
            gamePage.requestFullscreen().catch(err => console.log('Fullscreen request failed:', err.message));
        } else if (gamePage.webkitRequestFullscreen) {
            gamePage.webkitRequestFullscreen();
        } else if (gamePage.mozRequestFullScreen) {
            gamePage.mozRequestFullScreen();
        } else if (gamePage.msRequestFullscreen) {
            gamePage.msRequestFullscreen();
        }
        
        if (window.tetrisGame) {
            window.tetrisGame.start();
            this.updateGameDisplay(0, 0);
        }
    }

    toggleGamePause() {
        if (window.tetrisGame) {
            window.tetrisGame.togglePause();
        }
    }

    exitGame() {
        if (window.tetrisGame) {
            window.tetrisGame.stop();
        }
        
        // Exit fullscreen when leaving game
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.log('Exit fullscreen failed:', err.message));
        } else if (document.webkitFullscreenElement) {
            document.webkitExitFullscreen();
        } else if (document.mozFullScreenElement) {
            document.mozCancelFullScreen();
        } else if (document.msFullscreenElement) {
            document.msExitFullscreen();
        }
        
        this.showPage('lobbyPage');
    }

    updateGameDisplay(score, xpGained) {
        const user = accountSystem.getCurrentUser();
        if (!user) return;

        // Version desktop
        document.getElementById('gameScore').textContent = score;
        document.getElementById('gameXP').textContent = xpGained;
        document.getElementById('gameRecord').textContent = user.bestScore;
        document.getElementById('gameLevel').textContent = user.level;

        // Version mobile
        const mobileScore = document.getElementById('gameScore-mobile');
        const mobileXP = document.getElementById('gameXP-mobile');
        const mobileLevel = document.getElementById('gameLevel-mobile');
        
        if (mobileScore) mobileScore.textContent = score;
        if (mobileXP) mobileXP.textContent = xpGained;
        if (mobileLevel) mobileLevel.textContent = user.level;

        // Dessiner la prochaine pièce
        this.drawNextPiece();
    }

    updateGameScore(score) {
        document.getElementById('gameScore').textContent = score;
        const mobileScore = document.getElementById('gameScore-mobile');
        if (mobileScore) mobileScore.textContent = score;
    }

    drawNextPiece() {
        // Mettre à jour tous les canvas nextPiece (mobile et desktop)
        const canvases = document.querySelectorAll('#nextPieceCanvas');
        if (canvases.length === 0 || !window.tetrisGame || !window.tetrisGame.nextPiece) return;

        canvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            // Calculer la taille du bloc pour le canvas de la prochaine pièce
            const blockSize = Math.floor(canvas.width / 4) || 30;

            // Effacer le canvas
            ctx.fillStyle = 'rgba(10, 14, 39, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Grille
            ctx.strokeStyle = 'rgba(102, 126, 234, 0.1)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                ctx.beginPath();
                ctx.moveTo(i * blockSize, 0);
                ctx.lineTo(i * blockSize, canvas.height);
                ctx.stroke();
            }
            for (let i = 0; i <= 4; i++) {
                ctx.beginPath();
                ctx.moveTo(0, i * blockSize);
                ctx.lineTo(canvas.width, i * blockSize);
                ctx.stroke();
            }

            // Dessiner la pièce
            const piece = window.tetrisGame.nextPiece;
            const shape = piece.shape;
            const offsetX = (4 - shape[0].length) / 2;
            const offsetY = (4 - shape.length) / 2;

            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        const x = offsetX + col;
                        const y = offsetY + row;

                        // Support pour Red Bull (objet avec color et backgroundColor)
                        let blockColor = piece.color || '#888888';
                        if (typeof blockColor === 'object' && blockColor.color) {
                            blockColor = blockColor.color;
                        }

                        ctx.fillStyle = blockColor;
                        ctx.fillRect(x * blockSize + 1, y * blockSize + 1, blockSize - 2, blockSize - 2);

                        // Si c'est Red Bull, ajouter du texte "RB"
                        if (blockColor === '#001E50' && blockSize > 15) {
                            ctx.fillStyle = '#C0B0A0';
                            ctx.font = `bold ${Math.floor(blockSize * 0.5)}px Arial`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText('RB', x * blockSize + blockSize / 2, y * blockSize + blockSize / 2);
                        }

                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(x * blockSize + 1, y * blockSize + 1, blockSize - 2, blockSize - 2);
                    }
                }
            }
        });
    }

    // ============ GESTION DES SAUVEGARDES ============
    // Backup UI was removed from HTML per user request. Keep this method as a no-op
    // so existing initialization calls won't cause errors.
    setupBackupEventListeners() {
        return; // intentionally empty
    }

    // ============ AFFICHAGE DU CHANGELOG ============
    showChangelog() {
        const changelog = window.appChangelog || 'Aucun changelog disponible';
        const version = window.appVersion || '0.01';
        
        // Créer un popup avec le changelog
        const modal = document.createElement('div');
        modal.id = 'changelogModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, #1a1f3a 0%, #2d2156 100%);
            border: 2px solid #667eea;
            border-radius: 15px;
            padding: 25px;
            max-width: 600px;
            max-height: 70vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
        `;
        
        content.innerHTML = `
            <div style="text-align: center; margin-bottom: 15px;">
                <h2 style="color: #667eea; margin-bottom: 5px;">📝 Changelog</h2>
                <p style="color: #999; font-size: 14px;">Version ${version}</p>
            </div>
            <div style="white-space: pre-line; font-size: 13px; line-height: 1.6; color: #ddd; font-family: monospace;">
                ${changelog.split('\n').map(line => {
                    if (line.startsWith('v')) {
                        return `<span style="color: #667eea; font-weight: bold;">${line}</span>`;
                    } else if (line.startsWith('-')) {
                        return `<span style="color: #90ee90;">├─ ${line.substring(1)}</span>`;
                    }
                    return line;
                }).join('\n')}
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <button id="closeChangelogBtn" class="btn btn-primary" style="padding: 10px 25px;">Fermer</button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Fermer le modal
        document.getElementById('closeChangelogBtn').addEventListener('click', () => {
            modal.remove();
        });
        
        // Fermer en cliquant sur le fond
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// Instance globale - avec gestion des erreurs
let uiManager;
try {
    console.log('🚀 Création de UIManager...');
    uiManager = new UIManager();
    window.uiManager = uiManager;
    console.log('✅ UIManager créé et attaché à window');
} catch (error) {
    console.error('❌ Erreur création UIManager:', error);
    console.error('Stack:', error.stack);
    // Créer un objet dummy pour éviter les crashes
    window.uiManager = {
        showPage: () => console.warn('UIManager non disponible'),
        updateLobbyDisplay: () => console.warn('UIManager non disponible'),
        createAccount: () => console.warn('UIManager non disponible'),
        login: () => console.warn('UIManager non disponible')
    };
}
