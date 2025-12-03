// ============ SYSTÈME XP ET NIVEAUX ============
const XpSystem = {
    // Tableau des XP requis PAR NIVEAU pour passer au niveau suivant (niveau: xpNeeded)
    // XP réduit de 50% pour progression plus rapide
    perLevelXp: {
        1: 75,
        2: 150,
        3: 225,
        4: 325,
        5: 450,
        6: 600,
        7: 800,
        8: 1000,
        9: 1250,
        10: 1500,
        11: 2000,
        12: 2750,
        13: 3500,
        14: 4500,
        15: 6000,
        16: 7500,
        17: 10000,
        18: 15000,
        19: 22500,
        20: 37500
    },

    // Retourne le total d'XP cumulatif requis pour atteindre `level`.
    // Par convention: level 1 requiert 0 XP (début). Pour atteindre level 2 il faut perLevelXp[1], etc.
    getXpRequiredForLevel: function(level) {
        if (level <= 1) return 0;

        let total = 0;
        for (let i = 1; i < level; i++) {
            if (this.perLevelXp[i]) {
                total += this.perLevelXp[i];
            } else {
                // Si on dépasse la table fournie, extrapoler à partir du dernier palier connu
                const keys = Object.keys(this.perLevelXp).map(k => parseInt(k, 10)).sort((a,b)=>a-b);
                const lastKey = keys[keys.length - 1];
                const lastValue = this.perLevelXp[lastKey];
                // Croissance conservatrice: +50% par niveau au-delà
                const extraIndex = i - lastKey;
                total += Math.floor(lastValue * Math.pow(1.5, extraIndex));
            }
        }
        return total;
    },

    getLevelFromXP: function(totalXp) {
        let level = 1;
        while (this.getXpRequiredForLevel(level + 1) <= totalXp) {
            level++;
        }
        return level;
    },

    getXpProgressForLevel: function(totalXp) {
        const currentLevel = this.getLevelFromXP(totalXp);
        const currentLevelXp = this.getXpRequiredForLevel(currentLevel);
        const nextLevelXp = this.getXpRequiredForLevel(currentLevel + 1);
        
        const progress = totalXp - currentLevelXp;
        const required = nextLevelXp - currentLevelXp;
        
        return {
            current: progress,
            required: required,
            percentage: Math.floor((progress / required) * 100)
        };
    },

    getRandomXpGain: function() {
        // XP aléatoire: 1 à 5 points par pièce posée
        return Math.floor(Math.random() * 5) + 1;
    },

    getTotalXpForLevel: function(level) {
        return this.getXpRequiredForLevel(level);
    }
};

// Exporter pour utilisation globale
window.XpSystem = XpSystem;
