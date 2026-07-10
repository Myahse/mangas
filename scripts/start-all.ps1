<#
.SYNOPSIS
  Start MangAfric backend and all frontend dev servers (one terminal per app).

.DESCRIPTION
  Opens a separate PowerShell window for each service. Close this launcher with
  Ctrl+C to stop every spawned dev server.

.EXAMPLE
  .\scripts\start-all.ps1

.EXAMPLE
  .\scripts\start-all.ps1 -IncludeMobile

.EXAMPLE
  .\scripts\start-all.cmd
#>
param(
  [switch]$IncludeMobile,
  [switch]$NoBackend
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Start-DevTerminal {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Command,
    [string]$Url = ""
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing directory: $Path"
  }

  $title = "MangAfric - $Name"
  $escapedPath = $Path.Replace("'", "''")
  $urlLine = if ($Url) { "Write-Host 'URL: $Url'" } else { "" }

  $parts = @(
    "`$Host.UI.RawUI.WindowTitle = '$title'"
    "Write-Host '== $title ==' -ForegroundColor Cyan"
    $urlLine
    "Write-Host 'Dir: $Path'"
    "Write-Host 'Cmd: $Command'"
    "Set-Location -LiteralPath '$escapedPath'"
    $Command
  ) | Where-Object { $_ }
  $inner = ($parts -join "; ")

  Write-Host ("[{0}] opening terminal -> {1}" -f $Name, $Path)

  $proc = Start-Process -FilePath "powershell.exe" -WorkingDirectory $Path -PassThru -WindowStyle Normal -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command", $inner
  )

  return [pscustomobject]@{
    Name = $Name
    Path = $Path
    Url  = $Url
    Proc = $proc
  }
}

$root = Split-Path -Parent $PSScriptRoot
$targets = New-Object System.Collections.ArrayList

if (-not $NoBackend) {
  $backendDir = Join-Path $root "backend\mangafrik"
  if (-not (Test-Path -LiteralPath (Join-Path $backendDir "mvnw.cmd"))) {
    throw "Backend Maven wrapper missing under: $backendDir"
  }
  [void]$targets.Add(@{
      Name    = "backend-api"
      Path    = $backendDir
      Command = ".\mvnw.cmd spring-boot:run"
      Url     = "http://localhost:8088/swagger-ui.html"
    })
}

@(
  @{ Name = "front";         Dir = "front";         Url = "http://localhost:5173" },
  @{ Name = "admin-panel";   Dir = "admin-panel";   Url = "http://localhost:5195" },
  @{ Name = "creator-panel"; Dir = "creator-panel"; Url = "http://localhost:5174" },
  @{ Name = "ads-panel";     Dir = "ads-panel";     Url = "http://localhost:5999" },
  @{ Name = "support-panel"; Dir = "support-panel"; Url = "http://localhost:5185" },
  @{ Name = "finance-panel"; Dir = "finance-panel"; Url = "http://localhost:5205" }
) | ForEach-Object {
  [void]$targets.Add(@{
      Name    = $_.Name
      Path    = (Join-Path $root $_.Dir)
      Command = "npm run dev"
      Url     = $_.Url
    })
}

if ($IncludeMobile) {
  [void]$targets.Add(@{
      Name    = "mobile"
      Path    = (Join-Path $root "mobile")
      Command = "npx expo start"
      Url     = ""
    })
}

Write-Host ""
Write-Host "MangAfric dev launcher"
Write-Host "Root: $root"
Write-Host ("Starting {0} service(s)..." -f $targets.Count)
Write-Host ""

$started = @()
try {
  foreach ($t in $targets) {
    $started += Start-DevTerminal -Name $t.Name -Path $t.Path -Command $t.Command -Url $t.Url
    Start-Sleep -Milliseconds 300
  }

  Write-Host ""
  Write-Host "All terminals opened."
  Write-Host ""
  foreach ($s in $started) {
    $line = "  - $($s.Name)"
    if ($s.Url) { $line += "  $($s.Url)" }
    Write-Host $line
  }
  Write-Host ""
  Write-Host "API health: http://localhost:8088/api/v1/health"
  Write-Host "Press Ctrl+C in THIS window to stop all dev servers."
  Write-Host ""

  while ($true) {
    Start-Sleep -Seconds 2
    foreach ($s in @($started)) {
      if ($s.Proc.HasExited) {
        throw "Dev server '$($s.Name)' exited early (pid=$($s.Proc.Id))."
      }
    }
  }
} finally {
  Write-Host ""
  Write-Host "Stopping dev servers..."
  foreach ($s in $started) {
    try {
      if (-not $s.Proc.HasExited) {
        Stop-Process -Id $s.Proc.Id -Force -ErrorAction SilentlyContinue
      }
    } catch {}
  }
}
