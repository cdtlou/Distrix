// ============ SYSTÈME BOUTIQUE ============
const ShopSystem = {
    // Définition des skins
    skins: [
        { id: 0, name: 'Classic', level: 1, color: '#888888' },
        { id: 1, name: 'Red Bull', level: 2, color: '#001E50', backgroundColor: '#C0B0A0' },
        { id: 2, name: 'Vert', level: 3, color: '#00FF00' },
        { id: 3, name: 'Bleu', level: 4, color: '#0099FF' },
        { id: 4, name: 'Rouge', level: 5, color: '#FF3333' },
        { id: 5, name: 'Violet', level: 6, color: '#DD00FF' },
        { id: 6, name: 'Multicolor (Tetris)', level: 7, color: '#FF00FF', gradient: 'linear-gradient(135deg, #FF0000 0%, #FFD700 25%, #00FF00 50%, #0099FF 75%, #FF1493 100%)', isMulticolor: true },
        { id: 7, name: 'Rose', level: 8, color: '#FF1493' },
        { id: 8, name: 'Orange', level: 9, color: '#FF8C00' },
        { id: 9, name: 'Cyan', level: 10, color: '#00FFFF' },
        { id: 10, name: 'Lime', level: 11, color: '#32CD32' },
        { id: 11, name: 'Or', level: 12, color: '#FFD700' },
        { id: 12, name: 'Argent', level: 13, color: '#C0C0C0' },
        { id: 13, name: 'Arc-en-ciel', level: 14, color: '#FF6B9D' }
    ],

    // Définition des musiques
    musics: [
        { id: 0, name: 'Tetris Original', level: 1, url: 'assets/musique/tetris_original_meloboom.mp3', emoji: '🎵' },
        { id: 1, name: 'Tetris Cheerful', level: 2, url: 'assets/musique/tetris_cheerful_meloboom.mp3', emoji: '🎶' },
        { id: 2, name: 'Backtracking', level: 3, url: 'assets/musique/backtracking-tetris meloboom.mp3', emoji: '🎸' },
        { id: 3, name: 'Porta Rap', level: 4, url: 'assets/musique/porta-tetris-rap meloboom.mp3', emoji: '🎤' },
        { id: 4, name: 'Tetris 99 Theme', level: 5, url: 'assets/musique/tetris-99-theme meloboom.mp3', emoji: '🎮' },
        { id: 5, name: 'Ska Version', level: 6, url: 'assets/musique/tetris-ska-version meloboom.mp3', emoji: '🎺' },
        { id: 6, name: 'Soviet', level: 7, url: 'assets/musique/tetris-soviet meloboom.mp3', emoji: '🔴' },
        { id: 7, name: 'Techno Remix', level: 8, url: 'assets/musique/tetris-techno-remix meloboom.mp3', emoji: '🎧' },
        { id: 8, name: 'Tetris 2', level: 9, url: 'assets/musique/tetris2 meloboom.mp3', emoji: '🎵' },
        { id: 9, name: 'Metal', level: 10, url: 'assets/musique/tetrismetal meloboom.mp3', emoji: '🎸' },
        { id: 10, name: 'Tetris — Thème 1', level: 11, url: 'assets/musique/tetris_theme1.mp3', emoji: '🎵' },
        { id: 11, name: 'Tetris — Thème 2', level: 12, url: 'assets/musique/tetris_theme2.mp3', emoji: '🎶' },
        { id: 12, name: 'T E T R I S', level: 13, url: 'assets/musique/tetris_t_e_t_r_i_s.mp3', emoji: '🎵' }
    ],

    isItemUnlocked: function(itemType, itemId, playerLevel) {
        const items = itemType === 'skins' ? this.skins : this.musics;
        const item = items.find(i => i.id === itemId);
        
        if (!item) return false;
        return playerLevel >= item.level;
    },

    getItemsByType: function(type) {
        return type === 'skins' ? this.skins : this.musics;
    },

    getSkinColor: function(skinId) {
        const skin = this.skins.find(s => s.id === skinId);
        return skin ? skin.color : '#888888';
    },
    
    // Retourner l'objet complet du skin (avec backgroundColor si applicable)
    getSkinObject: function(skinId) {
        const skin = this.skins.find(s => s.id === skinId);
        if (!skin) return { color: '#888888' };
        
        // Retourner l'objet avec color et backgroundColor si Red Bull
        if (skin.name === 'Red Bull') {
            return {
                color: skin.color,
                backgroundColor: skin.backgroundColor
            };
        }
        
        // Pour le multicolor (Tetris), retourner plusieurs couleurs possibles
        if (skin.isMulticolor) {
            return {
                color: skin.color,
                isMulticolor: true,
                colors: ['#FF0000', '#FFD700', '#00FF00', '#0099FF', '#FF1493'] // Rouge, Or, Vert, Bleu, Rose
            };
        }
        
        return { color: skin.color };
    },
    
    // Obtenir l'XP requis pour débloquer un item (basé sur le niveau)
    getXpRequiredForItem: function(itemType, itemId) {
        const items = itemType === 'skins' ? this.skins : this.musics;
        const item = items.find(i => i.id === itemId);
        
        if (!item) return 0;
        
        // Utiliser le système XP pour obtenir l'XP nécessaire pour le niveau
        if (window.XpSystem) {
            return window.XpSystem.getXpRequiredForLevel(item.level);
        }
        
        return 0;
    }
};

// Exporter pour utilisation globale
window.ShopSystem = ShopSystem;
