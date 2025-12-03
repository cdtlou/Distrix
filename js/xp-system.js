// ============ SYSTÈME XP ET NIVEAUX ============
const XpSystem = {
    // Paliers XP totaux - Les vrais niveaux sont 1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60
    // Les niveaux intermédiaires sont calculés proportionnellement
    levelThresholds: {
        1: 0,
        5: 150,
        10: 500,
        15: 1200,
        20: 2000,
        25: 4500,
        30: 9000,
        35: 15000,
        40: 22000,
        45: 30000,
        50: 40000,
        55: 55000,
        60: 75000
    },

    // Obtenir le niveau réel basé sur l'XP total
    // Les niveaux affichés sont 1, 5, 10, 15, 20, etc.
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

        return currentLevel;
    },

    // Obtenir l'XP requis cumulatif pour atteindre un niveau
    getXpRequiredForLevel: function(level) {
        // Arrondir au palier le plus proche
        const thresholds = Object.keys(this.levelThresholds)
            .map(Number)
            .sort((a, b) => a - b);

        // Trouver le palier exact ou le plus proche
        if (this.levelThresholds[level] !== undefined) {
            return this.levelThresholds[level];
        }

        // Si le niveau n'existe pas dans les paliers, retourner le dernier
        return this.levelThresholds[thresholds[thresholds.length - 1]];
    },

    // Obtenir la progression pour le prochain palier
    getXpProgressForLevel: function(totalXp) {
        const thresholds = Object.keys(this.levelThresholds)
            .map(Number)
            .sort((a, b) => a - b);

        const currentLevel = this.getLevelFromXP(totalXp);
        const currentLevelIndex = thresholds.indexOf(currentLevel);

        // Trouver le prochain niveau
        let nextLevel = currentLevel;
        let nextLevelIndex = currentLevelIndex + 1;

        if (nextLevelIndex < thresholds.length) {
            nextLevel = thresholds[nextLevelIndex];
        }

        const currentLevelXp = this.levelThresholds[currentLevel];
        const nextLevelXp = this.levelThresholds[nextLevel];

        const progress = totalXp - currentLevelXp;
        const required = nextLevelXp - currentLevelXp;

        return {
            current: progress,
            required: required,
            percentage: required > 0 ? Math.floor((progress / required) * 100) : 100,
            currentLevel: currentLevel,
            nextLevel: nextLevel
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
