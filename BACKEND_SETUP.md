# Backend Distrix - Installation et Déploiement

## Option 1 : Lancer en local (développement)

### Prérequis
- Node.js 16+ installé ([https://nodejs.org](https://nodejs.org))

### Installation locale

```bash
cd server
npm install
npm start
```

Le serveur démarrera sur `http://localhost:3000`

### Tester le serveur

```bash
curl http://localhost:3000/api/health
# Doit retourner: {"status":"OK","message":"Backend Distrix est en ligne"}
```

Ensuite, va sur `http://localhost:8000` (ou ta page HTML locale) et clique sur Google Sign-In.

---

## Option 2 : Déployer sur Render.com (gratuit, 24/7)

### Étapes

1. **Créer un compte sur Render**: https://render.com
2. **Connecter ton GitHub** (optionnel, mais recommandé)
3. **Créer un nouveau service**:
   - Type: **Web Service**
   - Repository: `https://github.com/cdtlou/Distrix.git`
   - Runtime: **Node**
   - Build command: `cd server && npm install`
   - Start command: `cd server && npm start`
   - Port: `3000`

4. **Ajouter la variable d'environnement** (optionnel):
   - Clique sur "Environment"
   - Ajoute: `PORT=3000`

5. **Deploy!** 
   - Render créera une URL comme `https://distrix-backend.onrender.com`
   - Cette URL sera utilisée par ton app automatiquement

### Configuration CORS

Dans `server/server.js` ligne 12, ajoute ton URL GitHub Pages:

```javascript
origin: ['http://localhost:8000', 'http://localhost:3000', 'https://cdtlou.github.io'],
```

---

## Option 3 : Déployer sur Railway.app (aussi gratuit)

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Choose `Distrix` repository
5. Railway détectera `package.json` automatiquement
6. Ajoute le build command: `cd server && npm install`
7. Ajoute le start command: `cd server && npm start`
8. Deploy!

Railway te donnera une URL comme `https://distrix-backend-production.railway.app`

---

## Option 4 : Héberger sur Heroku (payant après free tier)

```bash
# Installer Heroku CLI
npm install -g heroku

# Login
heroku login

# Créer une app
heroku create distrix-backend

# Déployer
git push heroku main

# Voir les logs
heroku logs --tail
```

---

## Configuration finale du frontend

Une fois ton backend déployé, **mets à jour l'URL dans `js/account-system.js`**:

```javascript
// Ligne 10 dans account-system.js
this.serverUrl = 'https://TON-URL-BACKEND.com'; // Replace par ton URL
```

Exemple:
- Local: `http://localhost:3000`
- Render: `https://distrix-backend.onrender.com`
- Railway: `https://distrix-backend-production.railway.app`

---

## Endpoints disponibles

### 1. Vérifier la santé du serveur
```
GET /api/health
```

### 2. Vérifier et créer/charger un compte Google
```
POST /api/auth/verify-google
Body: { "token": "JWT_TOKEN_FROM_GOOGLE" }
Response: { "success": true, "account": {...} }
```

### 3. Charger un compte
```
GET /api/accounts/user@gmail.com
```

### 4. Sauvegarder/mettre à jour un compte
```
POST /api/accounts/user@gmail.com
Body: { "xp": 100, "bestScore": 500, ... }
```

### 5. Ajouter de l'XP
```
POST /api/accounts/user@gmail.com/addxp
Body: { "amount": 50 }
```

### 6. Mettre à jour le meilleur score
```
POST /api/accounts/user@gmail.com/bestscore
Body: { "score": 1000 }
```

### 7. Voir tous les comptes (DEBUG)
```
GET /api/admin/accounts
```

---

## Troubleshooting

### Erreur "Serveur indisponible"
- Vérifie que le backend est en ligne
- Vérifie CORS: assure-toi que ton domaine est dans `origin:` au serveur
- Regarde la console du navigateur pour les erreurs CORS

### Les données ne se sauvegardent pas
- Vérifie que le backend reçoit les requêtes (`GET /api/admin/accounts`)
- Regarde les logs du serveur pour les erreurs

### Token Google invalide
- Assure-toi que le Client ID dans `server.js` match celui de Google Cloud Console
- Vérifie que le token n'a pas expiré (expiration: 1 heure)

---

## Fichiers importants

- `server/server.js` : Code du serveur backend
- `server/accounts.json` : Base de données (créée automatiquement)
- `js/account-system.js` : Configuration `serverUrl` ligne 10
- `js/google-signin.js` : Appels API backend

---

Besoin d'aide? Demande! 🚀
