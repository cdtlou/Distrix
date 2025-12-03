# 🔐 GUIDE CONFIGURATION GITHUB OAUTH - SYSTEM INVISIBLE

## 📝 Résumé

Tu voulais:
- ✅ Sauvegarde GitHub **invisible**
- ✅ Connexion via **GitHub directe**
- ✅ Aucun bouton visible
- ✅ Sauvegarde **automatique**

**C'est fait!** Voici comment configurer GitHub OAuth.

---

## 🚀 Configuration Pas à Pas

### Étape 1: Créer une Application OAuth GitHub

1. Va sur: https://github.com/settings/developers
2. Clique: **"New OAuth App"**
3. Remplis les champs:
   - **Application name**: `Distrix Game`
   - **Homepage URL**: `http://localhost:3000` (ou ton domaine)
   - **Authorization callback URL**: `http://localhost:3000` (même URL)

4. Clique: **"Create OAuth application"**
5. Tu vas recevoir:
   - **Client ID** (copie-le)
   - **Client Secret** (ne partage pas!)

### Étape 2: Configurer Distrix avec le Client ID

Dans le fichier `index.html` ou dans le code, ajoute:

```javascript
// Au démarrage du jeu:
GitHubAuth.setupOAuthApp(
    'YOUR_CLIENT_ID_HERE',           // Ton Client ID GitHub
    'http://localhost:3000/callback' // Ton URL de callback
);
```

Ou dans `js/main.js`:

```javascript
// Ajouter au chargement:
GitHubAuth.setupOAuthApp(
    localStorage.getItem('githubClientId') || 'YOUR_CLIENT_ID',
    window.location.href.split('?')[0]
);
```

### Étape 3: Flux d'Authentification

```
User clique "Connexion GitHub"
    ↓
Redirection vers GitHub login
    ↓
User approuve Distrix
    ↓
Redirection vers Distrix avec CODE
    ↓
Code échangé pour TOKEN (côté serveur)
    ↓
Accounts chargés depuis GitHub
    ↓
User connecté + Comptes synchro ✅
```

---

## ⚠️ IMPORTANT: Backend OAuth

**Le truc critique:**

GitHub OAuth ne peut PAS être fait depuis le frontend uniquement (security).

Tu dois créer un petit backend (Node.js, Python, etc.) avec cet endpoint:

```javascript
// Node.js Express example
app.post('/api/github/token', async (req, res) => {
    const code = req.body.code;
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    
    // Échanger le code pour un token
    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code: code
        })
    });
    
    const data = await response.json();
    const token = data.access_token;
    
    // Récupérer les infos de l'utilisateur
    const userResponse = await fetch('https://api.github.com/user', {
        headers: {
            'Authorization': `token ${token}`
        }
    });
    
    const user = await userResponse.json();
    
    // Retourner token + user info
    res.json({
        access_token: token,
        user: {
            login: user.login,
            id: user.id,
            email: user.email
        }
    });
});
```

---

## 🔄 Flux de Données

### 1️⃣ Connexion GitHub
```
Première fois:
  User → Github Login → Code → Backend → Token → Repos créé auto
  
  Le backend:
  - Crée automatiquement repo "Distrix-Backup" (privé)
  - Retourne le token
  - Frontend stocke token
```

### 2️⃣ Sauvegarde Automatique
```
User joue
  ↓
Crée compte / Gagne XP
  ↓
account-system.saveAccounts()
  ↓
Si (githubAuth.isAuthenticated):
  ↓
githubAuth.saveAccountsToGitHub()
  ↓
API GitHub: Crée/met à jour accounts.json
  ✅ Automatique, invisible!
```

### 3️⃣ Restauration
```
User se connecte (login normal)
  ↓
githubAuth.isAuthenticated = true
  ↓
githubAuth.loadAccountsFromGitHub()
  ↓
Fusionne comptes GitHub + Locaux
  ↓
Tous ses comptes sur tous les appareils!
```

---

## 📁 Structure GitHub Finale

```
USER_REPO/
├─ Distrix-Backup/ (privé, créé auto)
│   └─ accounts.json (mis à jour auto)
└─ (autres repos de l'utilisateur)
```

Contenu de `accounts.json`:
```json
{
  "timestamp": "2025-12-03T18:45:00.000Z",
  "version": "0.03",
  "accountCount": 3,
  "accounts": {
    "Player1": { /* données */ },
    "Player2": { /* données */ },
    "Player3": { /* données */ }
  }
}
```

---

## 🔐 Sécurité

### Token Storage
- ✅ Stocké en **mémoire** (javascript)
- ✅ **Pas** dans localStorage
- ✅ Perdu si page recharge (c'est normal)
- ✅ À récupérer depuis GitHub si besoin

### Client Secret
- ⚠️ **JAMAIS** en frontend!
- ⚠️ **TOUJOURS** sur backend
- ⚠️ Protégé par variable d'env

### OAuth Flow
- ✅ Suit la spec GitHub official
- ✅ Code d'une seule utilisation
- ✅ Token unique par user

---

## 🎯 Configuration Finale

### Dans `js/main.js`:

```javascript
// Au démarrage
window.addEventListener('DOMContentLoaded', () => {
    // Configurer GitHub OAuth
    const clientId = 'TON_CLIENT_ID_ICI'; // Remplace par le vrai
    GitHubAuth.setupOAuthApp(clientId, window.location.href.split('?')[0]);
    
    console.log('✅ GitHub OAuth configuré');
});
```

### Variables d'env backend (.env):

```
GITHUB_CLIENT_ID=abc123xyz789
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxx
GITHUB_REDIRECT_URI=http://localhost:3000
```

---

## 🧪 Test

### 1. Tester la redirection OAuth
```javascript
// Console:
window.githubAuth.loginWithGitHub();
// Devrait rediriger vers GitHub
```

### 2. Vérifier le token reçu
```javascript
console.log(window.githubAuth.isAuthenticated);
console.log(window.githubAuth.githubUser);
console.log(window.githubAuth.githubToken.substring(0, 10) + '***'); // Masqué
```

### 3. Tester la sauvegarde
```javascript
// Après login:
await window.githubAuth.saveAccountsToGitHub(window.accountSystem.accounts);
// Vérifier sur GitHub
```

### 4. Tester la restauration
```javascript
const accounts = await window.githubAuth.loadAccountsFromGitHub();
console.log(accounts);
```

---

## ❌ Problèmes Courants

### "OAuth redirect_uri does not match"
- Vérifiez que l'URL de callback est **identique** dans GitHub et le code

### "Client ID invalid"
- Copie correctement depuis GitHub Settings

### "CORS error"
- C'est normal! L'API GitHub n'accepte pas les appels directs du frontend
- **Solution**: Faire l'échange via backend

### "Repo creation fails"
- Vérifiez que le token a la permission `repo`
- Vérifiez que le user n'a pas déjà Distrix-Backup

---

## 📚 Ressources

- Docs OAuth GitHub: https://docs.github.com/en/developers/apps/building-oauth-apps
- GitHub API Docs: https://docs.github.com/en/rest
- Flow OAuth 2: https://tools.ietf.org/html/rfc6749

---

## ✅ Résumé Final

Tu as maintenant:
- ✅ Système **invisible** de sauvegarde
- ✅ Login via **GitHub direct**
- ✅ Comptes **synchro** sur tous les appareils
- ✅ **Automatique** 100%
- ✅ Aucune config visible à l'utilisateur
- ✅ Repos **privé** auto-créé

**Pour l'utilisateur final:**
- Clique "Connexion GitHub"
- Approuve Distrix
- C'est tout! Ses comptes sont sauvegardés automatiquement

---

**Status**: ✅ Ready to configure and deploy

