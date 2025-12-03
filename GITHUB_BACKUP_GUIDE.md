# 🔐 Guide de Sauvegarde GitHub pour Distrix

## Pourquoi GitHub?
- **Gratuit et illimité** - Espace de stockage illimité
- **Sécurisé** - Vos données sont sur GitHub (Microsoft)
- **Accessible partout** - Accédez à vos comptes sur n'importe quel appareil
- **Historique complet** - Chaque sauvegarde est tracée avec timestamp
- **Récupération facile** - Restaurez vos comptes en 1 clic

## Configuration (5 minutes)

### Étape 1: Créer un Token GitHub Personnel

1. Allez sur: https://github.com/settings/tokens
2. Cliquez sur **"Generate new token (classic)"**
3. Donnez un nom au token: `Distrix Backup`
4. Sélectionnez la permission: **`repo`** (accès complet aux repositories)
5. Cliquez sur **"Generate token"**
6. **COPIEZ le token** (⚠️ vous ne pourrez le voir qu'une fois!)

### Étape 2: Configurer Distrix

1. Lancez Distrix et connectez-vous
2. Allez dans **Paramètres** (⚙️)
3. Cliquez sur **"🔐 Sauvegarde GitHub"**
4. Collez votre token dans le champ **"GitHub Personal Token"**
5. Cliquez sur **"💾 Enregistrer le Token"**
6. Vous devriez voir ✅ **"Configuré et Prêt"**

### Étape 3: Tester

1. Cliquez sur **"📤 Sauvegarder Maintenant"**
2. Si ça marche, vous verrez ✅ dans les logs
3. Vérifiez sur GitHub:
   - Allez sur votre repo Distrix
   - Allez dans **"backups/"** 
   - Vous devriez voir **"accounts-backup.json"**

## Utilisation

### Sauvegarde Automatique
- Chaque fois que vous **créez un compte**
- Chaque fois que vous **gagnez du XP**
- Chaque fois que vous **achetez un skin/musique**
- ✅ **Automatique** = vous n'avez rien à faire!

### Sauvegarde Manuelle
1. Allez dans **Paramètres → 🔐 Sauvegarde GitHub**
2. Cliquez **"📤 Sauvegarder Maintenant"**
3. Vérifiez dans les logs: ✅ ou ❌

### Restaurer vos Comptes
1. Allez dans **Paramètres → 🔐 Sauvegarde GitHub**
2. Cliquez **"📥 Restaurer depuis GitHub"**
3. Attendez un moment
4. ✅ Vos comptes sont restaurés!

### Voir l'Historique
1. Allez dans **Paramètres → 🔐 Sauvegarde GitHub**
2. Cliquez **"📋 Voir l'Historique"**
3. Vous verrez toutes vos sauvegardes avec dates/heures

## Fonctionnement Technique

### Architecture de Sauvegarde
```
Distrix (Local)
    ↓
    ├─ localStorage (Sauvegarde principale)
    ├─ sessionStorage (Backup)
    ├─ IndexedDB (Persistance)
    └─ GitHub (Sauvegarde cloud) ← TOI ICIIII
```

### Format du Backup
```json
{
  "timestamp": "2025-12-03T18:45:00.000Z",
  "version": "0.03",
  "accountCount": 3,
  "accounts": {
    "pseudo1": { /* données du compte */ },
    "pseudo2": { /* données du compte */ }
  }
}
```

### Sécurité
- ✅ Token stocké **localement** (pas envoyé nulle part)
- ✅ Données sur GitHub = protégées par GitHub
- ✅ Chaque compte a ses données propres
- ⚠️ **Important**: Gardez votre token PRIVÉ!

## Troubleshooting

### ❌ "Token non valide"
- Vérifiez que vous avez copié le **token complet**
- Assurez-vous que c'est un token **personnellement** (pas OAuth app)
- Réessayez: Effacez et entrez un nouveau token

### ❌ "Erreur 401"
- Votre token est **expiré** ou **invalide**
- Créez un **nouveau token** sur GitHub

### ❌ "Erreur 403"
- Vérifiez la **permission "repo"** sur votre token
- Régénérez un token avec les bonnes permissions

### ❌ "Pas de backup trouvé"
- C'est la **première fois**? Faites **"Sauvegarder Maintenant"** d'abord
- Vous êtes sur le **bon compte GitHub**?

### ❌ Les comptes ne se restaurent pas
- Vérifiez que vous êtes **connecté à Distrix**
- Cliquez **"📥 Restaurer"** à nouveau
- Consultez les **logs** pour plus de détails

## Multi-Appareil

### Comment ça marche?
1. **Appareil 1**: Vous jouez, gagnez XP → sauvegarde auto sur GitHub ✅
2. **Appareil 2**: Vous ouvrez Distrix → cliquez "Restaurer depuis GitHub" → comptes synchro ✅
3. **Appareil 3**: Même processus!

### Exemple Pratique
- Matin: Jouer sur **PC** → Comptes sauvegardés sur GitHub
- Midi: Jouer sur **Téléphone** → Restaurer depuis GitHub → Comptes là!
- Soir: Jouer sur **Tablette** → Restaurer depuis GitHub → Comptes là!

## FAQ

**Q: Où sont mes données?**
A: Sur votre repo GitHub privé, dans le fichier `backups/accounts-backup.json`

**Q: Est-ce que mes données sont sûres?**
A: Oui! Chiffrées par GitHub + Votre repo est privé

**Q: Je peux perdre mes comptes?**
A: Non, tu as 4 niveaux de backup (local + GitHub)

**Q: Combien ça coûte?**
A: GRATUIT! (tu peux créer 1 repo privé gratuitement)

**Q: Je veux supprimer mon backup?**
A: Allez sur GitHub → `backups/accounts-backup.json` → Supprimez le fichier

**Q: Puis-je avoir plusieurs tokens?**
A: Oui! Un par appareil/PC si tu veux

**Q: Mon token a été compromis, que faire?**
A: Allez sur https://github.com/settings/tokens → Supprimez le token compromis → Créez un nouveau

## Support

Si vous avez des problèmes:
1. Consultez les **logs** dans le modal GitHub
2. Vérifiez votre **token GitHub**
3. Assurez-vous que votre **repo est privé**
4. Testez avec **"Sauvegarder Maintenant"** d'abord

---

**Version**: v1.0  
**Dernière mise à jour**: 2025-12-03  
**Système**: GitHub Backup pour Distrix v0.03+
