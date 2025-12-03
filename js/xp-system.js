// ============ SYSTÈME XP ET NIVEAUX ============
const XpSystem = {
    // Paliers XP pour passer au prochain niveau (même structure que la boutique)
    // Niveau 1 (0 XP) → Niveau 2 (150 XP) → Niveau 3 (500 XP) etc.
    levelThresholds: {
        1: 0,
        2: 150,
        3: 500,
        4: 1200,
        5: 2000,
        6: 4500,
        7: 9000,
        8: 15000,
        9: 22000,
        10: 30000,
        11: 40000,
        12: 55000,
        13: 75000
    },

    // Obtenir le niveau réel basé sur l'XP total (max niveau 13)
    // Retourne un nombre simple: 1, 2, 3, 4... 13
    getLevelFromXP: function(totalXp) {
        const thresholds = Object.keys(this.levelThresholds)
            .map(Number)
            .sort((a, b) => a - b);

        let currentLevel = 1;

        for (let i = 0; i < thresholds.length; i++) {
            if (totalXp >= this.levelThresholds[thresholds[i]]) {
                currentLevel = thresholds[i];
            } else {
                break;
            }
        }

        // Capper au niveau maximum (13)
        return Math.min(currentLevel, 13);
    },

    // Obtenir l'XP requis cumulatif pour atteindre un niveau
    getXpRequiredForLevel: function(level) {
        // Capper au niveau maximum (13)
        const cappedLevel = Math.min(level, 13);
        
        if (this.levelThresholds[cappedLevel] !== undefined) {
            return this.levelThresholds[cappedLevel];
        }

        // Si le niveau n'existe pas, retourner le maximum
        return this.levelThresholds[13];
    },

    // Obtenir la progression pour le prochain palier
    getXpProgressForLevel: function(totalXp) {
        const thresholds = Object.keys(this.levelThresholds)
            .map(Number)
            .sort((a, b) => a - b);

        const currentLevel = this.getLevelFromXP(totalXp);
        
        // Si on est au niveau max, pas de prochain niveau
        if (currentLevel >= 13) {
            return {
                current: 0,
                required: 0,
                percentage: 100,
                currentLevel: 13,
                nextLevel: 13,
                isMaxLevel: true
            };
        }

        const currentLevelIndex = thresholds.indexOf(currentLevel);
        const nextLevel = thresholds[currentLevelIndex + 1];

        const currentLevelXp = this.levelThresholds[currentLevel];
        const nextLevelXp = this.levelThresholds[nextLevel];

        const progress = totalXp - currentLevelXp;
        const required = nextLevelXp - currentLevelXp;

        return {
            current: progress,
            required: required,
            percentage: required > 0 ? Math.floor((progress / required) * 100) : 100,
            currentLevel: currentLevel,
            nextLevel: nextLevel,
            isMaxLevel: false
        };
    },

    // XP aléatoire par pièce posée
    getRandomXpGain: function() {
        return Math.floor(Math.random() * 5) + 1;
    },

    // Obtenir l'XP total pour un niveau
    getTotalXpForLevel: function(level) {
        return this.getXpRequiredForLevel(level);
    }
};

// Exporter pour utilisation globale
window.XpSystem = XpSystem;
