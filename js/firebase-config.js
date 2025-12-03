// ============ CONFIGURATION FIREBASE ============
// Ce fichier contient la configuration pour la sauvegarde cloud

// NOTE: Ces clés sont publiques (c'est normal pour Firebase côté client)
// Elles ne donnent accès qu'aux données du jeu

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDfX-placeholder-replace-with-your-key",
    authDomain: "your-app.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-app.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// ============ INSTRUCTIONS DE SETUP ============
/*

ÉTAPE 1: Créer un projet Firebase
- Va sur https://console.firebase.google.com
- Clique "Créer un projet" → nomme le "Distrix"
- Attends que le projet soit créé

ÉTAPE 2: Ajouter une app Web
- Dans le projet, clique "Ajouter une app"
- Choisis "<>" (Web)
- Donne un nom: "Distrix Web"
- Copie la config Firebase

ÉTAPE 3: Remplacer les clés ci-dessus
- Copie la config complète
- Remplace les valeurs de FIREBASE_CONFIG

ÉTAPE 4: Activer Firestore Database
- Dans Firebase Console → Firestore Database
- Crée une base de données
- Mode: Démarrage en mode test (pour dev)
- Localisation: europe-west1

ÉTAPE 5: Activer Authentication
- Dans Firebase Console → Authentication
- Clique "Démarrer"
- Active "Email/Password"
- Active "Google" (optionnel)

ÉTAPE 6: Ajouter la règle de sécurité Firestore
- Onglet "Règles"
- Copie ceci:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Les utilisateurs peuvent lire/écrire leurs propres données
    match /accounts/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}

ÉTAPE 7: Charger le script Firebase dans index.html
- Le script est déjà chargé dans index.html
- Il utilise cette config

*/

// Exporter pour utilisation globale
window.FIREBASE_CONFIG = FIREBASE_CONFIG;
