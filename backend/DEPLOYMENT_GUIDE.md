# 🚀 GUIDE DÉPLOIEMENT - BACKEND OAUTH GITHUB

## 📝 Résumé

Tu as demandé: "quand la personne se connecte via github c'est via son adresse mail github de son compte"

**C'est fait!** Le système:
1. ✅ Récupère l'email GitHub de l'utilisateur
2. ✅ L'utilise comme pseudo automatiquement
3. ✅ Crée/charge les comptes avec cet email
4. ✅ Tout se fait automatiquement au login GitHub

---

## 🔧 Configuration Rapide

### Option 1: Local (Développement)

```bash
# 1. Cloner le repo
cd backend

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'env
cp .env.example .env
# Édite .env avec tes vraies valeurs GitHub

# 4. Démarrer le serveur
npm start

# Serveur lancé sur http://localhost:3000
```

### Option 2: Vercel (Production - Recommandé)

```bash
# 1. Installer Vercel CLI
npm i -g vercel

# 2. Configurer vercel.json (créer un fichier)
{
  "version": 2,
  "builds": [
    {
      "src": "backend/oauth-github.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/oauth-github.js"
    }
  ],
  "env": {
    "GITHUB_CLIENT_ID": "@github_client_id",
    "GITHUB_CLIENT_SECRET": "@github_client_secret",
    "GITHUB_REDIRECT_URI": "@github_redirect_uri"
  }
}

# 3. Déployer
vercel

# ✅ Ton API est live!
```

### Option 3: Heroku (Gratuit)

```bash
# 1. Installer Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# 2. Login
heroku login

# 3. Créer une app
heroku create distrix-oauth

# 4. Configurer les variables d'env
heroku config:set GITHUB_CLIENT_ID=xxx
heroku config:set GITHUB_CLIENT_SECRET=xxx
heroku config:set GITHUB_REDIRECT_URI=https://distrix-oauth.herokuapp.com

# 5. Déployer
git push heroku main

# ✅ Prêt!
```

---

## 🔐 Configuration GitHub OAuth

### 1. Créer une OAuth App

1. Va sur: https://github.com/settings/developers
2. Clique: **"New OAuth App"**
3. Remplis:
   - **Application name**: `Distrix`
   - **Homepage URL**: `http://localhost:3000` (dev) ou `https://distrix-oauth.herokuapp.com` (prod)
   - **Authorization callback URL**: 
     - Dev: `http://localhost:3000/api/github/token`
     - Prod: `https://distrix-oauth.herokuapp.com/api/github/token`

4. Tu reçois:
   - **Client ID** (public)
   - **Client Secret** (garde privé!)

### 2. Configurer les variables d'env

#### Localement (.env):
```
GITHUB_CLIENT_ID=abc123xyz789
GITHUB_CLIENT_SECRET=xxx_super_secret_xxx
GITHUB_REDIRECT_URI=http://localhost:3000
PORT=3000
```

#### Vercel:
```bash
vercel env add GITHUB_CLIENT_ID
vercel env add GITHUB_CLIENT_SECRET
vercel env add GITHUB_REDIRECT_URI
```

#### Heroku:
```bash
heroku config:set GITHUB_CLIENT_ID=abc123xyz789
heroku config:set GITHUB_CLIENT_SECRET=xxx_super_secret_xxx
heroku config:set GITHUB_REDIRECT_URI=https://distrix-oauth.herokuapp.com
```

---

## 🔄 Flux Complet

### User Side:
```
1. Arrive sur Distrix
   ↓
2. Clique "Connexion GitHub"
   ↓
3. Redirection GitHub
   ↓
4. Approuve Distrix
   ↓
5. Code retourné à Distrix
   ↓
6. Frontend envoie code au backend: POST /api/github/token
   ↓
7. Backend échange code → token
   ↓
8. Backend récupère:
   - login (user@github)
   - email (adresse email GitHub)
   - id, avatar, etc.
   ↓
9. Backend retourne: token + user info
   ↓
10. Frontend crée compte automatique avec l'EMAIL comme pseudo
    ↓
11. ✅ User connecté avec son email GitHub!
```

### Backend (ce qui se passe):
```javascript
POST /api/github/token
{
  code: "xxx_code_from_github_xxx"
}

RESPONSE:
{
  access_token: "ghu_xxxxxxxxxxxx",
  user: {
    login: "cdtlou",
    email: "user@example.com",  ← EMAIL UTILISÉ COMME PSEUDO
    id: 12345,
    avatar_url: "...",
    profile_url: "..."
  }
}
```

---

## 📁 Structure Backend

```
backend/
├─ oauth-github.js          (serveur principal)
├─ package.json             (dépendances)
├─ .env.example             (variables d'env modèle)
└─ vercel.json              (config Vercel)
```

---

## 🚀 Déploiement Recommandé: Vercel

### Étapes:

1. **Créer compte Vercel**
   - https://vercel.com
   - Login avec GitHub

2. **Connecter le repo**
   - Importe ton repo Distrix
   - Vercel détecte auto les fichiers

3. **Configurer variables d'env**
   - Settings → Environment Variables
   - Ajoute:
     - `GITHUB_CLIENT_ID`
     - `GITHUB_CLIENT_SECRET`
     - `GITHUB_REDIRECT_URI`

4. **Déployer**
   - Vercel déploie auto à chaque push!
   - URL: `https://distrix-{random}.vercel.app`

### Avantages Vercel:
- ✅ Gratuit
- ✅ Auto-deploy
- ✅ Certificat HTTPS inclus
- ✅ Scalable
- ✅ Support serverless

---

## 🧪 Tester le Backend

### Endpoint disponible:

```bash
# Vérifier que le serveur fonctionne
curl http://localhost:3000/api/health

RESPONSE:
{
  "status": "OK",
  "github_client_id": "✅ Configuré"
}
```

### Tester OAuth:

```bash
# Ce n'est que pour tester! En vrai, c'est via le frontend GitHub

# 1. Login GitHub → récupère un code
# (faire via https://github.com/login/oauth/authorize)

# 2. Envoyer le code au backend
curl -X POST http://localhost:3000/api/github/token \
  -H "Content-Type: application/json" \
  -d '{"code":"xxx_code_xxx"}'

RESPONSE:
{
  "success": true,
  "access_token": "ghu_xxxx",
  "user": {
    "login": "cdtlou",
    "email": "your@email.com",
    "id": 12345,
    ...
  }
}
```

---

## 🔗 Intégration Distrix Frontend

### Dans `js/github-auth.js`:

```javascript
loginWithGitHub() {
    // Redirect vers GitHub avec ton client ID
    const clientId = 'TON_CLIENT_ID_ICI';
    const redirectUri = 'http://localhost:3000'; // ou ton domaine
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    window.location.href = authUrl;
}

// Frontend envoie le code au backend
async exchangeCodeForToken(code) {
    const response = await fetch('/api/github/token', {
        method: 'POST',
        body: JSON.stringify({ code })
    });
    
    const data = await response.json();
    
    // ✅ data.user.email est utilisé comme pseudo!
    // Créer compte automatiquement
    accountSystem.createAccount(data.user.email, data.user.email);
}
```

---

## ⚠️ Points Importants

### Sécurité:
- ✅ **Client Secret JAMAIS en frontend!**
- ✅ **Toujours via backend**
- ✅ **Variables d'env sur serveur**

### Email GitHub:
- ✅ Public si configuré dans les settings GitHub
- ✅ Si privé, backend récupère de `/user/emails`
- ✅ Fallback: `username@github.com`

### Pseudo Automatique:
- ✅ Email GitHub = pseudo
- ✅ Créé automatiquement au login
- ✅ Même pseudo sur tous les appareils

---

## 🐛 Troubleshooting

### "CORS error"
- Backend doit avoir `cors` configuré
- ✅ Déjà dans le code!

### "OAuth redirect_uri mismatch"
- Vérifie que l'URL de callback correspond
- GitHub Settings vs .env vs Frontend

### "Email est null"
- GitHub email est privé
- ✅ Backend récupère automatiquement
- Si ça échoue: `username@github.com` par défaut

### "Client Secret exposed"
- ⚠️ Régénère IMMÉDIATEMENT
- Crée un nouveau secret sur GitHub Settings
- Met à jour .env

---

## 📚 Ressources

- GitHub OAuth Docs: https://docs.github.com/en/developers/apps/building-oauth-apps
- Vercel Deployment: https://vercel.com/docs
- Heroku Deployment: https://devcenter.heroku.com

---

## ✅ Résumé

Tu as maintenant:
- ✅ Backend OAuth sécurisé
- ✅ Email GitHub = pseudo automatique
- ✅ Comptes créés/chargés auto
- ✅ Multi-appareil synchro
- ✅ Sauvegarde GitHub auto

**Prêt à déployer!** 🚀

