# Script PowerShell pour augmenter automatiquement la version
# À exécuter avant chaque commit

$versionFile = "version.txt"

# Lire la version actuelle
if (Test-Path $versionFile) {
    $currentVersion = (Get-Content $versionFile -Raw).Trim()
} else {
    $currentVersion = "0.01"
}

Write-Host "Version actuelle: $currentVersion"

# Parser la version (0.01 → [0, 1])
$parts = $currentVersion.Split('.')
$major = [int]$parts[0]
$minor = [int]$parts[1]

# Augmenter le numéro mineur
$minor++

# Formater la nouvelle version
if ($minor -lt 10) {
    $newVersion = "$major.0$minor"
} else {
    $newVersion = "$major.$minor"
}

# Si on dépasse 0.99, passer à 1.00
if ($minor -ge 100) {
    $newVersion = "1.00"
}

# Écrire la nouvelle version
$newVersion | Out-File -FilePath $versionFile -NoNewline -Encoding UTF8

Write-Host "✅ Version mise à jour: $currentVersion → $newVersion"
Write-Host "📝 Exécutez: git add version.txt"
