param(
  [switch]$IncludeBackend,
  [switch]$IncludeMobile
)

$ErrorActionPreference = 'Stop'

function Start-DevServer {
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][string]$Command
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing directory: $Path"
  }

  Write-Host ("[{0}] starting in {1}" -f $Name, $Path)

  $proc = Start-Process -FilePath "powershell.exe" -WorkingDirectory $Path -PassThru -WindowStyle Normal -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command", $Command
  )

  return $proc
}

$root = Split-Path -Parent $PSScriptRoot

$targets = New-Object System.Collections.ArrayList

if ($IncludeBackend) {
  $backendDir = Join-Path $root "backend\mangafrik"
  if (-not (Test-Path -LiteralPath (Join-Path $backendDir "mvnw.cmd"))) {
    throw "Backend Maven wrapper missing under: $backendDir"
  }
  [void]$targets.Add(@{
      Name    = "backend-api"
      Path    = $backendDir
      Command = ".\mvnw.cmd spring-boot:run"
    })
}

@(
  @{ Name = "front";         Path = (Join-Path $root "front");          Command = "npm run dev" },
  @{ Name = "admin-panel";   Path = (Join-Path $root "admin-panel");    Command = "npm run dev" },
  @{ Name = "creator-panel"; Path = (Join-Path $root "creator-panel");  Command = "npm run dev" },
  @{ Name = "ads-panel";     Path = (Join-Path $root "ads-panel");      Command = "npm run dev" },
  @{ Name = "support-panel"; Path = (Join-Path $root "support-panel"); Command = "npm run dev" },
  @{ Name = "finance-panel"; Path = (Join-Path $root "finance-panel");  Command = "npm run dev" }
) | ForEach-Object { [void]$targets.Add($_) }

if ($IncludeMobile) {
  [void]$targets.Add(@{ Name = "mobile"; Path = (Join-Path $root "mobile"); Command = "npx expo start" })
}

$procs = @()
try {
  foreach ($t in $targets) {
    $procs += Start-DevServer -Name $t.Name -Path $t.Path -Command $t.Command
    Start-Sleep -Milliseconds 250
  }

  Write-Host ""
  Write-Host "All dev servers started."
  $swaggerUi = "http://localhost:8088/swagger-ui.html"
  $apiDocs = "http://localhost:8088/v3/api-docs"
  if ($IncludeBackend) {
    Write-Host "Swagger UI (when Spring Boot is up): $swaggerUi"
    Write-Host "OpenAPI JSON:                     $apiDocs"
  } else {
    Write-Host "Swagger is NOT started here (it's on the API). After you run the backend: $swaggerUi"
    Write-Host "OpenAPI JSON: $apiDocs"
  }
  Write-Host ""
  Write-Host "Close this window to stop everything (or press Ctrl+C here)."
  Write-Host ""

  while ($true) {
    Start-Sleep -Seconds 2
    foreach ($p in @($procs)) {
      if ($p.HasExited) {
        throw "Dev server exited early (pid=$($p.Id))."
      }
    }
  }
} finally {
  Write-Host ""
  Write-Host "Stopping dev servers..."
  foreach ($p in $procs) {
    try {
      if (-not $p.HasExited) { Stop-Process -Id $p.Id -Force }
    } catch {}
  }
}

