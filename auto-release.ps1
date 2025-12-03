# ============ SCRIPT AUTO-VERSION & CHANGELOG ============
# Ce script automatise TOUT:
# 1. Augmente la version
# 2. Génère le changelog depuis les commits Git
# 3. Commit les changements
# 4. Push sur GitHub

param(
    [string]$message = "Auto-commit"
)

# Couleurs pour l'affichage
$Green = "`e[32m"
$Blue = "`e[34m"
$Yellow = "`e[33m"
$Red = "`e[31m"
$Reset = "`e[0m"

# ============ ÉTAPE 1: LIRE LA VERSION ACTUELLE ============
Write-Host "${Blue}📦 Étape 1: Lire la version actuelle${Reset}"
$versionFile = "version.txt"

if (Test-Path $versionFile) {
    $currentVersion = (Get-Content $versionFile -Raw).Trim()
} else {
    $currentVersion = "0.01"
}

Write-Host "Version actuelle: $currentVersion"

# ============ ÉTAPE 2: AUGMENTER LA VERSION ============
Write-Host "${Blue}📦 Étape 2: Augmenter la version${Reset}"
$parts = $currentVersion.Split('.')
$major = [int]$parts[0]
$minor = [int]$parts[1]

$minor++

if ($minor -lt 10) {
    $newVersion = "$major.0$minor"
} elseif ($minor -lt 100) {
    $newVersion = "$major.$minor"
} else {
    $major++
    $minor = 0
    $newVersion = "$major.00"
}

Write-Host "Nouvelle version: $newVersion"

# ============ ÉTAPE 3: RÉCUPÉRER LES COMMITS RÉCENTS ============
Write-Host "${Blue}📝 Étape 3: Extraire les commits récents${Reset}"

# Récupérer tous les commits depuis la dernière version
$commits = git log --oneline -20 | ForEach-Object {
    $parts = $_ -split ' ', 2
    @{
        hash = $parts[0]
        message = $parts[1]
    }
}

if ($commits.Count -eq 0) {
    $commits = @()
}

Write-Host "Commits trouvés: $($commits.Count)"

# ============ ÉTAPE 4: GÉNÉRER LE CHANGELOG ============
Write-Host "${Blue}📝 Étape 4: Générer le changelog${Reset}"

$changelogContent = "v$newVersion - $(Get-Date -Format 'yyyy-MM-dd HH:mm')`n"
$changelogContent += "- $message`n"

# Ajouter les commits significatifs (ignorer les bump version)
$changelogContent += "`n"
foreach ($commit in $commits) {
    if ($commit.message -notmatch "Bump version" -and $commit.message -notmatch "Auto-commit") {
        # Nettoyer le message
        $msg = $commit.message -replace "^v[0-9]+\.[0-9]+ - ", ""
        $msg = $msg -replace "^Auto-version: ", ""
        $msg = $msg -replace " \[skip ci\]$", ""
        
        if ($msg.Length -gt 3) {
            # Ajouter des emojis intelligents (sans emojis pour éviter les problèmes d'encodage)
            $emoji = "[*]"
            if ($msg -match "fix|bug|error") { $emoji = "[BUG]" }
            if ($msg -match "feat|feature|add") { $emoji = "[NEW]" }
            if ($msg -match "perf|optim") { $emoji = "[OPT]" }
            if ($msg -match "doc|readme") { $emoji = "[DOC]" }
            if ($msg -match "style|format") { $emoji = "[STY]" }
            
            $changelogContent += "  $emoji $msg`n"
        }
    }
}

# Lire le changelog existant et l'ajouter
if (Test-Path "changelog.txt") {
    $existingChangelog = Get-Content "changelog.txt" -Raw
    # Ajouter une ligne vide avant le changelog existant
    $changelogContent += "`n" + $existingChangelog
}

# Écrire le nouveau changelog
$changelogContent | Out-File -FilePath "changelog.txt" -NoNewline -Encoding UTF8

Write-Host "${Green}✅ Changelog généré${Reset}"
Write-Host $changelogContent

# ============ ÉTAPE 5: METTRE À JOUR LA VERSION ============
Write-Host "${Blue}📝 Étape 5: Mettre à jour version.txt${Reset}"
$newVersion | Out-File -FilePath $versionFile -NoNewline -Encoding UTF8
Write-Host "${Green}✅ version.txt mis à jour: $newVersion${Reset}"

# ============ ÉTAPE 6: STAGE ET COMMIT ============
Write-Host "${Blue}📝 Étape 6: Git commit${Reset}"

git add version.txt changelog.txt
git add .

$commitMsg = "v$newVersion - $message"
git commit -m "$commitMsg [skip ci]"

if ($LASTEXITCODE -eq 0) {
    Write-Host "${Green}✅ Commit réussi${Reset}"
} else {
    Write-Host "${Yellow}⚠️  Rien à commiter${Reset}"
}

# ============ ÉTAPE 7: PUSH SUR GITHUB ============
Write-Host "${Blue}📤 Étape 7: Push sur GitHub${Reset}"

git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "${Green}✅ Push réussi!${Reset}"
} else {
    Write-Host "${Red}❌ Erreur lors du push${Reset}"
    exit 1
}

# ============ RÉSUMÉ ============
Write-Host "${Green}
╔════════════════════════════════════╗
║     ✅ SUCCÈS COMPLET!             ║
╠════════════════════════════════════╣
║ Version: $currentVersion → $newVersion${Reset}
${Green}║ Changelog généré automatiquement   ║
║ Commits: $($commits.Count) trouvés               ║
║ Push: ✅ GitHub                    ║
╚════════════════════════════════════╝
${Reset}"

Write-Host "Rafraîchis le jeu pour voir la nouvelle version! 🎮"
