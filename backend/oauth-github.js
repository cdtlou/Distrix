// ============ BACKEND OAUTH GITHUB ============
// Exemple complet Node.js + Express
// À déployer sur ton serveur

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Variables d'env
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000';

// ============ ENDPOINT OAUTH ============
app.post('/api/github/token', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Code manquant' });
        }

        console.log('🔐 Échange du code pour un token...');

        // ============ ÉTAPE 1: Échange code → token ============
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code: code,
                redirect_uri: REDIRECT_URI
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            console.error('❌ Erreur GitHub:', tokenData.error);
            return res.status(401).json({ error: 'OAuth failed', details: tokenData });
        }

        const access_token = tokenData.access_token;
        console.log('✅ Token reçu');

        // ============ ÉTAPE 2: Récupérer les infos de l'utilisateur ============
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${access_token}`,
                'Accept': 'application/json'
            }
        });

        const userData = await userResponse.json();

        if (!userData.login) {
            console.error('❌ Erreur récupération user:', userData);
            return res.status(401).json({ error: 'Failed to get user info' });
        }

        console.log(`✅ User: ${userData.login}`);

        // ============ ÉTAPE 3: Récupérer l'EMAIL (IMPORTANT!) ============
        // L'email public peut être null, faut vérifier les emails primaires
        let userEmail = userData.email;

        if (!userEmail) {
            // L'email n'est pas public, le récupérer depuis l'endpoint emails
            const emailResponse = await fetch('https://api.github.com/user/emails', {
                headers: {
                    'Authorization': `token ${access_token}`,
                    'Accept': 'application/json'
                }
            });

            const emailData = await emailResponse.json();

            // Chercher l'email primaire
            const primaryEmail = emailData.find(e => e.primary);
            userEmail = primaryEmail ? primaryEmail.email : userData.login + '@github.com';

            console.log(`ℹ️ Email primaire: ${userEmail}`);
        } else {
            console.log(`ℹ️ Email public: ${userEmail}`);
        }

        // ============ ÉTAPE 4: Retourner les données au frontend ============
        res.json({
            success: true,
            access_token: access_token,
            user: {
                login: userData.login,
                id: userData.id,
                email: userEmail,
                avatar_url: userData.avatar_url,
                profile_url: userData.html_url
            }
        });

        console.log(`✅ Réponse envoyée pour: ${userEmail}`);

    } catch (error) {
        console.error('❌ Erreur serveur:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// ============ TEST ENDPOINT ============
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', github_client_id: GITHUB_CLIENT_ID ? '✅ Configuré' : '❌ Non configuré' });
});

// ============ DÉMARRER LE SERVEUR ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
    console.log(`🔐 GitHub OAuth configuré`);
    console.log(`   Client ID: ${GITHUB_CLIENT_ID ? '✅' : '❌'}`);
    console.log(`   Client Secret: ${GITHUB_CLIENT_SECRET ? '✅' : '❌'}`);
});

// ============ EXPORT pour serverless (Vercel, etc.) ============
module.exports = app;
