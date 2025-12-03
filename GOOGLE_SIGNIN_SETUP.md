# 🔐 Configuration Google Sign-In

## Étapes pour configurer:

### 1. Créer un projet Google Cloud
- Va à https://console.cloud.google.com/
- Crée un nouveau projet "Distrix"

### 2. Activer l'API Google Identity
- Dans "APIs & Services"
- Active "Google+ API"

### 3. Créer les identifiants OAuth
- Va à "Credentials"
- Clique "Create Credentials" → "OAuth Client ID"
- Type: "Web application"
- Authorized JavaScript origins:
  - `http://localhost:3000` (développement)
  - `http://127.0.0.1:8000` (développement)
  - `https://cdtlou.github.io` (production)
- Authorized redirect URIs: (laisse vide pour Sign-In)

### 4. Copier le Client ID
- Tu recevras un `CLIENT_ID`
- Remplace `YOUR_GOOGLE_CLIENT_ID` dans `index.html` ligne ~27

### 5. Tester
- Lance le jeu
- Clique sur le bouton "Sign in with Google"
- Sélectionne ton compte Google
- Le compte sera créé automatiquement!

## Exemple:
```html
data-client_id="123456789-abcdefg.apps.googleusercontent.com"
```

## Notes:
- L'email Google devient le pseudo
- Le User ID Google devient le code (très long et sécurisé)
- Aucun mot de passe nécessaire!
- Le compte est automatiquement créé et connecté

## Dépannage:
Si ça ne marche pas:
1. Vérifie que le Client ID est correct
2. Vérifie que le domaine est autorisé
3. Ouvre la console (F12) et cherche les erreurs
4. Le token Google doit être décodé correctement
