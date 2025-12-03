// ============ SYSTÈME BOUTIQUE ============
const ShopSystem = {
    // Définition des skins
    skins: [
        { id: 0, name: 'Classic', level: 1, color: '#888888' }, // Gris par défaut
        { id: 1, name: 'Red Bull', level: 2, color: '#001E50', backgroundColor: '#C0B0A0' },    // Bleu foncé Red Bull + argent
        { id: 2, name: 'Bleu', level: 5, color: '#0099FF' },   // Bleu
        { id: 3, name: 'Rouge', level: 8, color: '#FF3333' },  // Rouge
        { id: 4, name: 'Violet', level: 13, color: '#DD00FF' }  // Violet
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
