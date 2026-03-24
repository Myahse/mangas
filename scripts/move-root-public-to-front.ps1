# Moves Dev root `public/` static assets into `front/public/` (main-style layout) and removes the old folder.
# Run from repo root:  powershell -ExecutionPolicy Bypass -File .\scripts\move-root-public-to-front.ps1

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path 'public')) {
  Write-Host "Nothing to do: public\ not found."
  exit 0
}

New-Item -ItemType Directory -Force -Path 'front\public' | Out-Null

# Copy binary trees + any root public files not already provided under front/public.
# (We keep front/public/db.json if you already fixed paths there; merge by copying non-JSON first.)
if (Test-Path 'public\chapters') {
  Copy-Item -Path 'public\chapters' -Destination 'front\public' -Recurse -Force
}
if (Test-Path 'public\characters') {
  Copy-Item -Path 'public\characters' -Destination 'front\public' -Recurse -Force
}

# Optional: copy favicon/icons if missing in front/public
foreach ($f in @('favicon.svg', 'icons.svg')) {
  if ((Test-Path "public\$f") -and -not (Test-Path "front\public\$f")) {
    Copy-Item -Path "public\$f" -Destination "front\public\$f" -Force
  }
}

# If db.json only exists under public\, copy it once; prefer fixing heroCover paths for Vite.
if ((Test-Path 'public\db.json') -and -not (Test-Path 'front\public\db.json')) {
  Copy-Item -Path 'public\db.json' -Destination 'front\public\db.json' -Force
}

# Normalize heroCover paths when served from Vite public dir (no "public/" prefix).
if (Test-Path 'front\public\db.json') {
  $db = Get-Content -Raw -Path 'front\public\db.json'
  $db2 = $db -replace '"public/characters/', '"/characters/'
  if ($db2 -ne $db) {
    Set-Content -Path 'front\public\db.json' -Value $db2 -Encoding utf8
  }
}

Remove-Item -Recurse -Force 'public'
Write-Host "Done: moved public assets to front\public and removed public\"
