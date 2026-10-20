#requires -Version 5.1
<#
  MERP-UI - Creation du ZIP Foundry depuis le depot Git local.
  Compatible Windows PowerShell 5.1 / PowerShell 7.
  Ne modifie aucun fichier du depot, et n'ecrase aucun ZIP existant.
#>
[CmdletBinding()]
param(
  [string] $RepoPath = '',
  [string] $OutputDirectory = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Info([string] $Message) { Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function OK([string] $Message)   { Write-Host "[ OK ] $Message" -ForegroundColor Green }
function Fail([string] $Message) { throw $Message }
function Read-Json([string] $Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { Fail "Fichier manquant : $Path" }
  try { return (Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json) }
  catch { Fail "JSON invalide : $Path`n$($_.Exception.Message)" }
}
function Get-RelativePath([string] $FullName, [string] $Root) {
  $relative = $FullName.Substring($Root.Length).TrimStart([char]'\', [char]'/')
  return $relative.Replace('\', '/')
}
function Reject-Path([string] $Relative) {
  $parts = $Relative.Split('/')
  # Jamais de fichiers de travail, de caches ou de copies imbriquees.
  foreach ($part in $parts) {
    if ($part -in @('.git', '.github', '.svn', 'node_modules', '__pycache__', '.vscode',
                    '.idea', 'dist', 'releases', 'backups')) { return $true }
  }
  if ($parts[0] -eq 'merp-ui') { return $true }  # copie du module dans sa propre racine
  $name = $parts[$parts.Length - 1]
  if ($name -in @('.DS_Store', 'Thumbs.db', 'desktop.ini', '.gitkeep',
                  '.gitattributes', '.gitignore')) { return $true }
  if ($name.StartsWith('~')) { return $true }
  $extension = [System.IO.Path]::GetExtension($name).ToLowerInvariant()
  if ($extension -in @('.zip','.7z','.rar','.bak','.tmp','.old','.log','.ldb','.lock',
                       '.sqlite','.ps1','.cmd','.partial','.pyc')) { return $true }
  return $false
}

if ([string]::IsNullOrWhiteSpace($RepoPath)) {
  $RepoPath = Join-Path $PSScriptRoot '..\..'
}
$root = [System.IO.Path]::GetFullPath($RepoPath).TrimEnd([char]'\', [char]'/')
if (-not (Test-Path -LiteralPath $root -PathType Container)) { Fail "Depot introuvable : $root" }
if (-not (Test-Path -LiteralPath (Join-Path $root '.git'))) {
  Fail "Ce dossier ne semble pas etre un depot Git : $root. Copiez d'abord tools/publication dans votre depot local."
}

Info "Depot : $root"
$module = Read-Json (Join-Path $root 'module.json')
if ($module.id -ne 'merp-ui') { Fail "Le module.json n'est pas celui de MERP-UI (id = $($module.id))." }
$version = [string] $module.version
if ($version -notmatch '^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$') {
  Fail "Version de module.json non reconnue : $version"
}
$zipName = "merp-ui-$version.zip"
$expectedManifest = 'https://raw.githubusercontent.com/Blackbiji/merp-ui/main/module.json'
$expectedDownload = "https://github.com/Blackbiji/merp-ui/releases/download/v$version/$zipName"
if ([string] $module.manifest -cne $expectedManifest) {
  Fail "Lien manifest incorrect dans module.json. Attendu : $expectedManifest"
}
if ([string] $module.download -cne $expectedDownload) {
  Fail "Lien download incorrect dans module.json. Attendu : $expectedDownload"
}
$packagePath = Join-Path $root 'package.json'
if (Test-Path -LiteralPath $packagePath -PathType Leaf) {
  $package = Read-Json $packagePath
  if ([string] $package.version -cne $version) {
    Fail "Versions differentes : module.json = $version, package.json = $($package.version)."
  }
}
OK "Manifeste et version : $version"

# Les fichiers .db sont les sources NeDB de premiere installation des packs.
# Les repertoires packs/<nom>/ generes par Foundry (LevelDB) ne sont pas distribues.
$manifestPacks = @($module.packs)
if ($manifestPacks.Count -lt 1) { Fail 'module.json ne declare aucun compendium.' }
$packSeedFiles = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
foreach ($pack in $manifestPacks) {
  $packPath = ([string] $pack.path).Replace('\', '/')
  if (-not $packPath.StartsWith('packs/')) { Fail "Chemin de compendium inattendu : $packPath" }
  if ($packPath.EndsWith('.db')) { $seedRel = $packPath }
  else { $seedRel = "$packPath.db" }
  if ($seedRel.Contains('..')) { Fail "Chemin de compendium suspect : $seedRel" }
  $seedFile = Join-Path $root ($seedRel.Replace([char]'/', [char]'\'))
  if (-not (Test-Path -LiteralPath $seedFile -PathType Leaf)) {
    Fail "Base NeDB de demarrage absente : $seedRel. Regenerer et committer les .db avant publication."
  }
  $file = Get-Item -LiteralPath $seedFile
  if ($file.Length -le 0) { Fail "Base NeDB vide : $seedRel" }
  $packSeedFiles.Add($file)
}
OK "$($manifestPacks.Count) compendiums : fichiers .db de demarrage presents"

# Le manifeste des sources permet de detecter une synchronisation oubliee.
$sourceConfig = Read-Json (Join-Path $root 'source\compendiums\manifest.json')
$syncFile = Join-Path $root 'source\compendiums\content-sync-manifest.json'
$syncManifest = Read-Json $syncFile
if (@($sourceConfig.packs).Count -ne $manifestPacks.Count -or
    @($syncManifest.packs).Count -ne $manifestPacks.Count) {
  Fail 'Nombre de compendiums incoherent entre les manifestes.'
}
$sourceTotal = 0
foreach ($definition in @($sourceConfig.packs)) {
  $name = [string] $definition.name
  $declared = @($manifestPacks | Where-Object { $_.name -eq $name })
  $synced = @($syncManifest.packs | Where-Object { $_.name -eq $name })
  if ($declared.Count -ne 1 -or $synced.Count -ne 1) {
    Fail "Compendium absent ou en doublon dans les manifestes : $name"
  }
  $dir = Join-Path $root (([string] $definition.sourceDirectory).Replace([char]'/', [char]'\'))
  if (-not (Test-Path -LiteralPath $dir -PathType Container)) { Fail "Sources absentes : $dir" }
  $sourceFiles = @(Get-ChildItem -LiteralPath $dir -File -Filter '*.json')
  $expectedCount = [int] $definition.count
  if ($sourceFiles.Count -ne $expectedCount -or @($synced[0].sources).Count -ne $expectedCount) {
    Fail "$name : $($sourceFiles.Count) fichiers source, $(@($synced[0].sources).Count) references, $expectedCount attendus."
  }
  $seenSources = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($source in @($synced[0].sources)) {
    $path = ([string] $source.file).Replace([char]'/', [char]'\')
    if (-not $seenSources.Add($path)) { Fail "Source en doublon dans le manifeste : $path" }
    $expectedPrefix = ([string] $definition.sourceDirectory).Replace([char]'/', [char]'\') + '\'
    if (-not $path.StartsWith($expectedPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or
        $path.Contains('..')) { Fail "Chemin source non reconnu : $path" }
    $filePath = Join-Path $root $path
    if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) { Fail "Source manquante : $path" }
    $actualHash = (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -cne [string] $source.hash) {
      Fail "Source modifiee sans regenerer le manifeste : $path`nUtiliser la generation du manifeste MERP-RMU avant publication."
    }
  }
  $seedName = "packs/$name.db"
  $seedFile = Join-Path $root ($seedName.Replace([char]'/', [char]'\'))
  $seedCount = @([System.IO.File]::ReadLines($seedFile) | Where-Object { $_.Trim().Length -gt 0 }).Count
  if ($seedCount -ne $expectedCount) {
    Fail "$seedName contient $seedCount documents, mais $expectedCount sources sont annoncees."
  }
  $sourceTotal += $expectedCount
}
OK "$sourceTotal sources / $($manifestPacks.Count) compendiums : empreintes et quantites coherentes"

# Controle facultatif plus profond si Node.js est installe.
$node = Get-Command node -ErrorAction SilentlyContinue
if ($null -ne $node) {
  Info 'Node.js disponible : controle de la fingerprint du manifeste...'
  Push-Location -LiteralPath $root
  try {
    & $node.Source 'scripts/build-merp-rmu-sync-manifest.mjs' '--check'
    if ($LASTEXITCODE -ne 0) { Fail 'La verification Node.js du manifeste a echoue.' }
  }
  finally { Pop-Location }
  OK 'Fingerprint globale validee avec Node.js'
} else {
  Write-Host '[AVERTISSEMENT] Node.js absent : empreintes individuelles verifiees, empreinte globale non recalculee.' -ForegroundColor Yellow
}

# Liste blanche : aucune copie massive du depot, aucun dossier .git ni base LevelDB.
$releaseDirectories = @('assets','data','docs','fonts','lang','scripts','source',
                        'styles','templates','translations')
$rootFiles = @('module.json','package.json','README.md','LICENSE','NOTICE.md','CHANGELOG.md')
$files = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
foreach ($name in $rootFiles) {
  $p = Join-Path $root $name
  if (Test-Path -LiteralPath $p -PathType Leaf) { $files.Add((Get-Item -LiteralPath $p)) }
}
foreach ($dirName in $releaseDirectories) {
  $dirPath = Join-Path $root $dirName
  if (-not (Test-Path -LiteralPath $dirPath -PathType Container)) { continue }
  foreach ($file in (Get-ChildItem -LiteralPath $dirPath -Recurse -File -Force)) {
    $rel = Get-RelativePath $file.FullName $root
    if (-not (Reject-Path $rel)) { $files.Add($file) }
  }
}
foreach ($file in $packSeedFiles) { $files.Add($file) }

$paths = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($file in $files) {
  $rel = Get-RelativePath $file.FullName $root
  if (-not $paths.Add($rel)) { Fail "Chemin en doublon dans l'archive : $rel" }
}
foreach ($relative in @('module.json','scripts/merp-ui.js','scripts/merp-rmu-content.js',
                       'lang/fr.json','lang/en.json','styles/merp-theme.css',
                       'source/compendiums/content-sync-manifest.json')) {
  if (-not $paths.Contains($relative)) { Fail "Fichier indispensable absent du ZIP : $relative" }
}
foreach ($entry in @($module.esmodules) + @($module.styles) + @($module.languages | ForEach-Object { $_.path }) +
                   @($module.license, $module.readme)) {
  $relative = ([string] $entry).Replace('\','/')
  if (-not $paths.Contains($relative)) { Fail "Ressource referencee par module.json absente : $relative" }
}
OK "$($files.Count) fichiers selectionnes, sans historique Git ni LevelDB"

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
  $documents = [Environment]::GetFolderPath([Environment+SpecialFolder]::MyDocuments)
  if ([string]::IsNullOrWhiteSpace($documents)) { $documents = Join-Path $env:USERPROFILE 'Documents' }
  $OutputDirectory = Join-Path $documents 'MERP-UI-Releases'
}
$outputRoot = [System.IO.Path]::GetFullPath($OutputDirectory).TrimEnd([char]'\',[char]'/')
if ($outputRoot -eq $root -or $outputRoot.StartsWith($root + [System.IO.Path]::DirectorySeparatorChar,
                                                   [System.StringComparison]::OrdinalIgnoreCase)) {
  Fail 'Le dossier de publication doit etre situe HORS du depot Git local.'
}
if (-not (Test-Path -LiteralPath $outputRoot -PathType Container)) {
  New-Item -ItemType Directory -Path $outputRoot | Out-Null
}
$output = Join-Path $outputRoot $zipName
$partial = Join-Path $outputRoot ("$zipName.partial")
if (Test-Path -LiteralPath $output) { Fail "Cette archive existe deja : $output. Elle ne sera pas ecrasee." }
if (Test-Path -LiteralPath $partial) { Fail "Un fichier temporaire existe deja : $partial" }

$zip = $null
try {
  Info "Compression : $zipName"
  $zip = [System.IO.Compression.ZipFile]::Open($partial, [System.IO.Compression.ZipArchiveMode]::Create)
  foreach ($file in ($files | Sort-Object FullName)) {
    $relative = Get-RelativePath $file.FullName $root
    $entry = $zip.CreateEntry($relative, [System.IO.Compression.CompressionLevel]::Optimal)
    $sourceStream = $null
    $target = $null
    try {
      $sourceStream = [System.IO.File]::OpenRead($file.FullName)
      $target = $entry.Open()
      $sourceStream.CopyTo($target)
    }
    finally {
      if ($null -ne $target) { $target.Dispose() }
      if ($null -ne $sourceStream) { $sourceStream.Dispose() }
    }
  }
  $zip.Dispose()
  $zip = $null

  # Relire l'archive : fichiers, tailles, racine et absence de dossiers indus.
  $verify = [System.IO.Compression.ZipFile]::OpenRead($partial)
  try {
    if ($verify.Entries.Count -ne $files.Count) { Fail 'Nombre de fichiers incorrect dans le ZIP final.' }
    $verifiedPaths = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($entry in $verify.Entries) {
      if (-not $verifiedPaths.Add($entry.FullName)) { Fail "Doublon ZIP : $($entry.FullName)" }
      if (Reject-Path $entry.FullName) { Fail "Fichier interdit dans ZIP : $($entry.FullName)" }
      $stream = $null
      try {
        $stream = $entry.Open()
        $buffer = New-Object byte[] 65536
        [long] $length = 0
        while (($read = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) { $length += $read }
        if ($length -ne $entry.Length) { Fail "Fichier incomplet dans le ZIP : $($entry.FullName)" }
      }
      finally { if ($null -ne $stream) { $stream.Dispose() } }
    }
    if (-not $verifiedPaths.Contains('module.json')) { Fail 'module.json doit etre a la racine du ZIP.' }
  }
  finally { $verify.Dispose() }

  Move-Item -LiteralPath $partial -Destination $output
  $hash = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash
  $size = [Math]::Round((Get-Item -LiteralPath $output).Length / 1MB, 2)
  Write-Host ''
  OK 'ARCHIVE CONSTRUITE ET CONTROLEE'
  Write-Host "Version  : $version"
  Write-Host "Fichiers : $($files.Count)"
  Write-Host "Taille   : $size Mio"
  Write-Host "SHA-256  : $hash"
  Write-Host "ZIP      : $output" -ForegroundColor Green
  Write-Host ''
  Write-Host "Publier sur GitHub : tag v$version ; joindre exactement $zipName ; cocher Pre-release si RC."
  Write-Host 'Tester ensuite la mise a jour et une installation neuve dans Foundry.'
}
catch {
  if ($null -ne $zip) { $zip.Dispose() }
  if (Test-Path -LiteralPath $partial) { Remove-Item -LiteralPath $partial -Force -ErrorAction SilentlyContinue }
  throw
}
