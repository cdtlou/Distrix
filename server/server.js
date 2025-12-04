import express from 'express';
import cors from 'cors';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration Google OAuth
const GOOGLE_CLIENT_ID = '1049140117448-3rekdda7kshkkikr3dfqo8jeaj24mer5.apps.googleusercontent.com';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Middleware
app.use(cors({
    origin: ['http://localhost:8000', 'http://localhost:3000', 'https://cdtlou.github.io'],
    credentials: true
}));
app.use(express.json());

// Chemin pour la base de données JSON
const dbPath = path.join(__dirname, 'accounts.json');

// Charger les comptes depuis le fichier JSON
function loadAccounts() {
    try {
        if (fs.existsSync(dbPath)) {
            const data = fs.readFileSync(dbPath, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('❌ Erreur lecture database:', error);
    }
    return {};
}

// Sauvegarder les comptes dans le fichier JSON
function saveAccounts(accounts) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(accounts, null, 2), 'utf-8');
        console.log('✅ Comptes sauvegardés');
    } catch (error) {
        console.error('❌ Erreur sauvegarde database:', error);
    }
}

// ============ ROUTES ============

// Vérifier la santé du serveur
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend Distrix est en ligne' });
});

// Vérifier et créer/mettre à jour un compte avec Google
app.post('/api/auth/verify-google', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Token manquant' });
        }

        // Vérifier le token Google
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name;

        console.log(`✅ Token Google vérifié pour: ${email}`);

        const accounts = loadAccounts();
        const accountKey = email; // Utiliser l'email comme clé unique

        // Si le compte existe, le charger; sinon créer un nouveau
        let account = accounts[accountKey];

        if (!account) {
            console.log(`📝 Création nouveau compte pour: ${email}`);
            account = {
                email: email,
                googleId: googleId,
                name: name,
                pseudo: email.split('@')[0],
                code: googleId,
                xp: 0,
                level: 1,
                bestScore: 0,
                ownedItems: {
                    skins: [0],
                    musics: [0]
                },
                equippedSkin: 0,
                equippedMusic: 0,
                musicVolume: 100,
                effectsVolume: 100,
                controls: {
                    left: 'a',
                    right: 'd',
                    rotate: 'w',
                    down: 's',
                    hardDrop: ' '
                },
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                version: 2
            };
        } else {
            // Mettre à jour le dernier login
            account.lastLogin = new Date().toISOString();
            account.googleId = googleId; // Mettre à jour si changé
            console.log(`✅ Compte existant trouvé: ${email}`);
        }

        accounts[accountKey] = account;
        saveAccounts(accounts);

        res.json({
            success: true,
            account: account,
            message: 'Compte chargé/créé avec succès'
        });
    } catch (error) {
        console.error('❌ Erreur vérification Google:', error);
        res.status(401).json({ success: false, message: 'Token invalide' });
    }
});

// Charger les données d'un compte
app.get('/api/accounts/:email', (req, res) => {
    try {
        const email = decodeURIComponent(req.params.email);
        const accounts = loadAccounts();
        const account = accounts[email];

        if (!account) {
            return res.status(404).json({ success: false, message: 'Compte non trouvé' });
        }

        res.json({ success: true, account });
    } catch (error) {
        console.error('❌ Erreur lecture compte:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// Sauvegarder/mettre à jour un compte
app.post('/api/accounts/:email', (req, res) => {
    try {
        const email = decodeURIComponent(req.params.email);
        const updatedData = req.body;

        // Défense: refuser les mises à jour vides (pour éviter suppression accidentelle)
        if (!updatedData || Object.keys(updatedData).length === 0) {
            return res.status(400).json({ success: false, message: 'Payload vide - mise à jour refusée' });
        }

        const accounts = loadAccounts();
        let account = accounts[email];

        if (!account) {
            return res.status(404).json({ success: false, message: 'Compte non trouvé' });
        }

        // Mettre à jour les champs fournis
        account = { ...account, ...updatedData };
        account.lastUpdated = new Date().toISOString();

        accounts[email] = account;
        saveAccounts(accounts);

        res.json({
            success: true,
            message: 'Compte mis à jour',
            account
        });
    } catch (error) {
        console.error('❌ Erreur sauvegarde compte:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// (Compat) Endpoint pour recevoir un objet complet de comptes (utilisé par anciens clients)
app.post('/api/accounts', (req, res) => {
    try {
        const data = req.body;

        // Défense: refuser les payloads vides
        if (!data || !data.accounts || Object.keys(data.accounts).length === 0) {
            console.warn('⚠️ Rejected empty /api/accounts payload');
            return res.status(400).json({ success: false, message: 'Payload vide ou invalide' });
        }

        // Charger, fusionner et sauvegarder
        const accounts = loadAccounts();
        Object.assign(accounts, data.accounts);
        saveAccounts(accounts);

        res.json({ success: true, message: 'Comptes synchronisés (compat)', totalAccounts: Object.keys(accounts).length });
    } catch (error) {
        console.error('❌ Erreur /api/accounts:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// Ajouter de l'XP
app.post('/api/accounts/:email/addxp', (req, res) => {
    try {
        const email = decodeURIComponent(req.params.email);
        const { amount } = req.body;

        if (!amount || amount < 0) {
            return res.status(400).json({ success: false, message: 'Montant XP invalide' });
        }

        const accounts = loadAccounts();
        const account = accounts[email];

        if (!account) {
            return res.status(404).json({ success: false, message: 'Compte non trouvé' });
        }

        account.xp += amount;
        // Recalculer le niveau (si XP system disponible côté serveur)
        account.lastUpdated = new Date().toISOString();

        accounts[email] = account;
        saveAccounts(accounts);

        res.json({
            success: true,
            message: 'XP ajouté',
            newXP: account.xp,
            account
        });
    } catch (error) {
        console.error('❌ Erreur ajout XP:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// Mettre à jour le meilleur score
app.post('/api/accounts/:email/bestscore', (req, res) => {
    try {
        const email = decodeURIComponent(req.params.email);
        const { score } = req.body;

        if (score === undefined) {
            return res.status(400).json({ success: false, message: 'Score manquant' });
        }

        const accounts = loadAccounts();
        const account = accounts[email];

        if (!account) {
            return res.status(404).json({ success: false, message: 'Compte non trouvé' });
        }

        if (score > account.bestScore) {
            account.bestScore = score;
            accounts[email] = account;
            saveAccounts(accounts);
            res.json({
                success: true,
                message: 'Nouveau record!',
                bestScore: account.bestScore,
                account
            });
        } else {
            res.json({
                success: true,
                message: 'Score non meilleur',
                bestScore: account.bestScore,
                account
            });
        }
    } catch (error) {
        console.error('❌ Erreur update score:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// Lister tous les comptes (debug seulement - à protéger en prod)
app.get('/api/admin/accounts', (req, res) => {
    try {
        const accounts = loadAccounts();
        res.json({
            success: true,
            count: Object.keys(accounts).length,
            accounts: Object.keys(accounts).map(email => ({
                email,
                pseudo: accounts[email].pseudo,
                xp: accounts[email].xp,
                level: accounts[email].level,
                bestScore: accounts[email].bestScore,
                createdAt: accounts[email].createdAt,
                lastLogin: accounts[email].lastLogin
            }))
        });
    } catch (error) {
        console.error('❌ Erreur lecture comptes:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🚀 Backend Distrix lancé sur http://localhost:${PORT}`);
    console.log(`📝 Base de données: ${dbPath}`);
    console.log(`🔐 Google Client ID: ${GOOGLE_CLIENT_ID}`);
});
