// ============ SYSTÈME XP ET NIVEAUX ============
const XpSystem = {
    // Tableau des XP requis PAR NIVEAU pour passer au niveau suivant (niveau: xpNeeded)
    // Basé sur les paliers XP totales spécifiés
    perLevelXp: {
        1: 0,       // Niveau 1: 0 XP total
        2: 30,      // Niveau 2: 30 XP (total 30 vers niveau 5)
        3: 30,      // Niveau 3: 30 XP (total 60)
        4: 30,      // Niveau 4: 30 XP (total 90)
        5: 60,      // Niveau 5: 150 XP total
        6: 70,      // Niveau 6: 70 XP (total 220)
        7: 70,      // Niveau 7: 70 XP (total 290)
        8: 70,      // Niveau 8: 70 XP (total 360)
        9: 70,      // Niveau 9: 70 XP (total 430)
        10: 70,     // Niveau 10: 500 XP total
        11: 140,    // Niveau 11: 140 XP (total 640)
        12: 140,    // Niveau 12: 140 XP (total 780)
        13: 140,    // Niveau 13: 140 XP (total 920)
        14: 140,    // Niveau 14: 140 XP (total 1060)
        15: 140,    // Niveau 15: 1200 XP total
        16: 160,    // Niveau 16: 160 XP (total 1360)
        17: 160,    // Niveau 17: 160 XP (total 1520)
        18: 160,    // Niveau 18: 160 XP (total 1680)
        19: 160,    // Niveau 19: 160 XP (total 1840)
        20: 160,    // Niveau 20: 2000 XP total
        21: 500,    // Niveau 21: 500 XP (total 2500)
        22: 500,    // Niveau 22: 500 XP (total 3000)
        23: 500,    // Niveau 23: 500 XP (total 3500)
        24: 500,    // Niveau 24: 500 XP (total 4000)
        25: 500,    // Niveau 25: 4500 XP total
        26: 900,    // Niveau 26: 900 XP (total 5400)
        27: 900,    // Niveau 27: 900 XP (total 6300)
        28: 900,    // Niveau 28: 900 XP (total 7200)
        29: 900,    // Niveau 29: 900 XP (total 8100)
        30: 900,    // Niveau 30: 9000 XP total
        31: 1200,   // Niveau 31: 1200 XP (total 10200)
        32: 1200,   // Niveau 32: 1200 XP (total 11400)
        33: 1200,   // Niveau 33: 1200 XP (total 12600)
        34: 1200,   // Niveau 34: 1200 XP (total 13800)
        35: 1200,   // Niveau 35: 15000 XP total
        36: 1400,   // Niveau 36: 1400 XP (total 16400)
        37: 1400,   // Niveau 37: 1400 XP (total 17800)
        38: 1400,   // Niveau 38: 1400 XP (total 19200)
        39: 1400,   // Niveau 39: 1400 XP (total 20600)
        40: 1400,   // Niveau 40: 22000 XP total
        41: 1600,   // Niveau 41: 1600 XP (total 23600)
        42: 1600,   // Niveau 42: 1600 XP (total 25200)
        43: 1600,   // Niveau 43: 1600 XP (total 26800)
        44: 1600,   // Niveau 44: 1600 XP (total 28400)
        45: 1600,   // Niveau 45: 30000 XP total
        46: 2000,   // Niveau 46: 2000 XP (total 32000)
        47: 2000,   // Niveau 47: 2000 XP (total 34000)
        48: 2000,   // Niveau 48: 2000 XP (total 36000)
        49: 2000,   // Niveau 49: 2000 XP (total 38000)
        50: 2000,   // Niveau 50: 40000 XP total
        51: 3000,   // Niveau 51: 3000 XP (total 43000)
        52: 3000,   // Niveau 52: 3000 XP (total 46000)
        53: 3000,   // Niveau 53: 3000 XP (total 49000)
        54: 3000,   // Niveau 54: 3000 XP (total 52000)
        55: 3000,   // Niveau 55: 55000 XP total
        56: 4000,   // Niveau 56: 4000 XP (total 59000)
        57: 4000,   // Niveau 57: 4000 XP (total 63000)
        58: 4000,   // Niveau 58: 4000 XP (total 67000)
        59: 4000,   // Niveau 59: 4000 XP (total 71000)
        60: 4000    // Niveau 60: 75000 XP total
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
