# Configuration Google OAuth - Distrix

## ✅ Checklist de configuration

### 1️⃣ Dans Google Cloud Console

#### Accéder aux credentials
- Ouvre : https://console.cloud.google.com/apis/credentials
- Assure-toi d'être sur le bon projet Google

#### Sélectionner le Client OAuth Web
- Clique sur ton ID Client OAuth 2.0 : `1049140117448-3rekdda7kshkkikr3dfqo8jeaj24mer5.apps.googleusercontent.com`
- Type : **Web application**

#### ✔️ Origines JavaScript autorisées (REQUIS)
Ajoute les deux origines ci-dessous dans la section "Authorized JavaScript origins" :

```
https://cdtlou.github.io
http://localhost:8000
```

**Important:** Pas de slash final, pas de chemin après le domaine.

#### ✔️ URI de redirection autorisés (REQUIS pour le callback)
Ajoute cet URI exact dans la section "Authorized redirect URIs" :

```
https://cdtlou.github.io/-Distrix-/oauth-callback.html
```

**Important:** Respecte EXACTEMENT les majuscules et les tirets (y compris le `-Distrix-`).

#### Sauvegarder
- Clique sur "Enregistrer" / "Save"
- **Attends 1–5 minutes** pour que les changements se propagent

---

### 2️⃣ Vérifier l'écran de consentement OAuth

- Va dans : APIs & Services → OAuth consent screen
- Vérifie que l'écran existe et que le statut est correct :
  - Si **Testing** : ajoute ton adresse Google en tant que Test user
  - Si **Production** : l'application est visible à tous (optionnel selon tes besoins)

---

### 3️⃣ Tester

#### Local (http://localhost:8000)
```powershell
cd D:\index.html
python -m http.server 8000
```
Puis ouvre `http://localhost:8000` et clique sur "Connexion avec Google".

#### Distant (GitHub Pages)
Va sur : https://cdtlou.github.io/-Distrix-/ et clique sur "Connexion avec Google".

---

### 4️⃣ Dépannage

#### Erreur `invalid_client`
- **Cause 1** : L'origin ne figure pas dans "Authorized JavaScript origins"
  - **Fix** : Ajoute `https://cdtlou.github.io` (ou `http://localhost:PORT` si local)
- **Cause 2** : Typo dans le Client ID dans `index.html`
  - **Fix** : Vérifie que `data-client_id` contient `1049140117448-3rekdda7kshkkikr3dfqo8jeaj24mer5.apps.googleusercontent.com`

#### Erreur `redirect_uri_mismatch`
- **Cause** : L'URI du callback ne correspond pas exactement
  - **Fix** : Dans "Authorized redirect URIs", ajoute EXACTEMENT : `https://cdtlou.github.io/-Distrix-/oauth-callback.html`

#### Le bouton Google n'apparaît pas
- **Cause 1** : Ton bloqueur de contenu bloque `accounts.google.com`
  - **Fix** : Désactive le bloqueur pour ce site
- **Cause 2** : La page n'a pas chargé le script Google Identity
  - **Fix** : Vérifie que le `<script src="https://accounts.google.com/gsi/client"...>` est présent dans `index.html`
- **Cause 3** : Les changements ne se sont pas propagés
  - **Fix** : Attends 5 minutes et vide le cache du navigateur (Ctrl+Shift+Del)

#### Console réseau affiche une erreur JSON
1. Ouvre DevTools (F12)
2. Onglet **Network**
3. Clique sur "Connexion avec Google"
4. Cherche la requête vers `accounts.google.com`
5. Clique dessus et consulte la réponse JSON
6. Copie-la et envoie-la pour analyse

---

### 5️⃣ Fichiers modifiés

- `index.html` : Contient le bouton Google avec le Client ID
- `oauth-callback.html` : Page de callback qui traite la redirection Google

---

### 6️⃣ Flow du Sign-In

1. **Clic sur le bouton** → Google Identity Services charge le widget
2. **L'utilisateur se connecte** → Google redirige vers `oauth-callback.html` avec un `code`
3. **oauth-callback.html** → Décode le code et redirige vers la page principale
4. **js/main.js / js/google-signin.js** → Traite la connexion et crée/connecte le compte

---

## 📝 Notes

- Le Client ID est **public** (utilisé côté client)
- Le `client_secret` ne doit **jamais** être partagé (utilisé côté serveur uniquement)
- Chaque environnement (local, staging, production) **doit avoir son origin** dans la Console

Besoin d'aide ? Ouvre la Console du navigateur (DevTools → F12 → Console) pour voir les logs détaillés.
