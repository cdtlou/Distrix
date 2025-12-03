// ============ AUTO-RELOAD EN DÉVELOPPEMENT ============
// Ce script surveille les changements de fichiers et recharge automatiquement la page

(function() {
    // Vérifier si on est en développement (localhost)
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!isDev) {
        console.log('ℹ️ Auto-reload désactivé (pas en développement local)');
        return;
    }

    console.log('🔄 Auto-reload DEV activé - Les changements seront détectés automatiquement');

    // Stocker les hashs des fichiers
    let fileHashes = {};
    
    // Liste des fichiers à surveiller
    const filesToWatch = [
        'css/styles.css',
        'js/main.js',
        'js/account-system.js',
        'js/audio-system.js',
        'js/shop-system.js',
        'js/tetris-game.js',
        'js/ui-manager.js',
        'js/xp-system.js',
        'index.html'
    ];

    // Fonction pour obtenir le hash d'un fichier
    async function getFileHash(url) {
        try {
            const response = await fetch(url + '?t=' + Date.now(), { 
                method: 'HEAD',
                cache: 'no-store'
            });
            
            if (!response.ok) return null;
            
            // Utiliser la date de dernière modification comme indicateur
            const lastModified = response.headers.get('Last-Modified');
            const contentLength = response.headers.get('Content-Length');
            
            return `${lastModified}-${contentLength}`;
        } catch (error) {
            console.warn(`⚠️ Erreur lors de la vérification de ${url}:`, error.message);
            return null;
        }
    }

    // Fonction pour vérifier les changements
    async function checkForChanges() {
        let hasChanges = false;

        for (const file of filesToWatch) {
            try {
                const hash = await getFileHash(file);
                
                if (hash === null) continue;
                
                if (!fileHashes[file]) {
                    // Première vérification
                    fileHashes[file] = hash;
                } else if (fileHashes[file] !== hash) {
                    console.log(`🔄 CHANGEMENT DÉTECTÉ: ${file}`);
                    hasChanges = true;
                    fileHashes[file] = hash;
                }
            } catch (error) {
                console.warn(`⚠️ Erreur pour ${file}:`, error.message);
            }
        }

        if (hasChanges) {
            console.log('🔄 Rechargement de la page dans 500ms...');
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
    }

    // Initialiser les hashs
    async function initialize() {
        console.log('📋 Initialisation de la surveillance des fichiers...');
        for (const file of filesToWatch) {
            try {
                const hash = await getFileHash(file);
                if (hash !== null) {
                    fileHashes[file] = hash;
                    console.log(`✅ ${file} surveille`);
                }
            } catch (error) {
                console.warn(`⚠️ Impossible de surveiller ${file}`);
            }
        }
        
        // Commencer les vérifications
        console.log('✅ Surveillance active - Vérification toutes les 1 seconde');
        setInterval(checkForChanges, 1000);
    }

    // Initialiser au chargement de la page
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
