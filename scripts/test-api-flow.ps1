<#
.SYNOPSIS
  Smoke-test MangAfric API flows and endpoints against a running backend.

.DESCRIPTION
  Registers a throwaway user, logs in as admin + user, then walks public catalog,
  wallet, store, support, and admin read endpoints. Destructive admin writes are
  skipped by default.

  Requires the Spring Boot API to be running (default http://localhost:8088).
  From CMD, use test-api-flow.cmd (or call PowerShell explicitly).

.EXAMPLE
  .\scripts\test-api-flow.cmd

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\test-api-flow.ps1
#>
param(
  [string]$BaseUrl = $(if ($env:APP_PUBLIC_API_BASE_URL) { $env:APP_PUBLIC_API_BASE_URL } else { "http://localhost:8088" }),
  [string]$AdminEmail = $(if ($env:APP_BOOTSTRAP_ADMIN_EMAIL) { $env:APP_BOOTSTRAP_ADMIN_EMAIL } else { "mangafric@gmail.com" }),
  [string]$AdminPassword = $(if ($env:APP_BOOTSTRAP_ADMIN_PASSWORD) { $env:APP_BOOTSTRAP_ADMIN_PASSWORD } else { "MangAfric123" }),
  [int]$HealthTimeoutSec = 90,
  [switch]$IncludeOpenApi,
  [switch]$IncludeEmailSend
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ApiRoot = ($BaseUrl.TrimEnd("/")) + "/api/v1"
$RunId = [Guid]::NewGuid().ToString("N").Substring(0, 8)
$TestUserEmail = "api-flow-$RunId@example.com"
$TestUserPassword = "ApiFlow!$RunId"
$TestUserName = "API Flow $RunId"

$script:Passed = 0
$script:Failed = 0
$script:Skipped = 0
$script:Results = New-Object System.Collections.Generic.List[object]

function Write-Section([string]$Title) {
  [Console]::WriteLine()
  [Console]::WriteLine("== $Title ==")
}

function Write-BannerLine([string]$Line) {
  [Console]::WriteLine($Line)
}

function Record-Result {
  param(
    [string]$Name,
    [ValidateSet("pass", "fail", "skip")]
    [string]$Status,
    [string]$Detail = ""
  )

  switch ($Status) {
    "pass" { $script:Passed++ ; $color = "Green" ; $symbol = "PASS" }
    "fail" { $script:Failed++ ; $color = "Red"   ; $symbol = "FAIL" }
    "skip" { $script:Skipped++ ; $color = "Yellow"; $symbol = "SKIP" }
  }

  $line = if ($Detail) { "[$symbol] $Name - $Detail" } else { "[$symbol] $Name" }
  Write-Host $line -ForegroundColor $color
  $script:Results.Add([pscustomobject]@{ Status = $symbol; Name = $Name; Detail = $Detail })
}

function Invoke-Api {
  param(
    [Parameter(Mandatory = $true)][ValidateSet("GET", "POST", "PATCH", "PUT", "DELETE")]
    [string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [hashtable]$Headers = @{},
    [object]$Body = $null,
    [int[]]$AllowedStatus = @(200),
    [switch]$Raw
  )

  $uri = if ($Path.StartsWith("http")) { $Path } else { "$ApiRoot$Path" }
  $params = @{
    Method      = $Method
    Uri         = $uri
    Headers     = $Headers
    ContentType = "application/json; charset=utf-8"
  }

  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 12 -Compress)
  }

  try {
    $response = Invoke-WebRequest @params -UseBasicParsing
    $status = [int]$response.StatusCode
    $content = $response.Content
  } catch {
    $ex = $_.Exception
    if ($ex.Response -and $ex.Response.StatusCode) {
      $status = [int]$ex.Response.StatusCode.value__
      $reader = New-Object System.IO.StreamReader($ex.Response.GetResponseStream())
      $content = $reader.ReadToEnd()
      $reader.Close()
    } else {
      throw
    }
  }

  $ok = $AllowedStatus -contains $status
  $parsed = $null
  if ($content -and -not $Raw) {
    try {
      $jsonParams = @{ InputObject = $content }
      if ($PSVersionTable.PSVersion.Major -ge 6) {
        $jsonParams.Depth = 12
      }
      $parsed = ConvertFrom-Json @jsonParams
    } catch {
      $parsed = $content
    }
  } elseif ($Raw) {
    $parsed = $content
  }

  return [pscustomobject]@{
    Ok      = $ok
    Status  = $status
    Body    = $parsed
    RawBody = $content
  }
}

function Get-JsonProperty {
  param(
    [object]$Object,
    [string[]]$Names
  )

  if ($null -eq $Object) { return $null }

  foreach ($name in $Names) {
    if ($Object -is [System.Collections.IDictionary]) {
      if ($Object.Contains($name)) { return $Object[$name] }
    } elseif ($Object.PSObject.Properties.Match($name).Count -gt 0) {
      return $Object.$name
    }
  }

  return $null
}

function Get-JsonItems([object]$Body) {
  if ($null -eq $Body) { return ,@() }

  $items = Get-JsonProperty -Object $Body -Names @("items")
  if ($null -ne $items) {
    if ($items -is [System.Array]) { return ,$items }
    return ,@($items)
  }
  if ($Body -is [System.Array]) { return ,$Body }

  return ,@($Body)
}

function Test-CollectionNotEmpty([object]$Value) {
  if ($null -eq $Value) { return $false }
  return @($Value).Length -gt 0
}

function Test-Endpoint {
  param(
    [string]$Name,
    [string]$Method,
    [string]$Path,
    [hashtable]$Headers = @{},
    [object]$Body = $null,
    [int[]]$AllowedStatus = @(200),
    [switch]$Skip,
    [string]$SkipReason = "skipped",
    [switch]$PassThru
  )

  if ($Skip) {
    Record-Result -Name $Name -Status skip -Detail $SkipReason
    return
  }

  try {
    $res = Invoke-Api -Method $Method -Path $Path -Headers $Headers -Body $Body -AllowedStatus $AllowedStatus
    if ($res.Ok) {
      Record-Result -Name $Name -Status pass -Detail "$($res.Status)"
    } else {
      $detail = "expected $($AllowedStatus -join '|'), got $($res.Status)"
      $err = Get-JsonProperty -Object $res.Body -Names @("error", "message", "title")
      if ($err) { $detail = "$detail - $err" }
      Record-Result -Name $Name -Status fail -Detail $detail
    }

    if ($PassThru) { return $res }
  } catch {
    Record-Result -Name $Name -Status fail -Detail $_.Exception.Message
    if ($PassThru) { return $null }
  }
}

function Wait-ForHealth {
  $deadline = (Get-Date).AddSeconds($HealthTimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $res = Invoke-Api -Method GET -Path "/health" -AllowedStatus @(200)
      if ($res.Ok) { return $true }
    } catch {}
    Start-Sleep -Seconds 2
  }
  return $false
}

function Get-BearerHeaders([string]$Token) {
  return @{ Authorization = "Bearer $Token" }
}

function Login([string]$Email, [string]$Password) {
  $res = Invoke-Api -Method POST -Path "/auth/login" -Body @{
    email    = $Email
    password = $Password
  } -AllowedStatus @(200, 400)

  $token = Get-JsonProperty -Object $res.Body -Names @("token")
  if (-not $res.Ok -or -not $token) {
    throw "Login failed for $Email (HTTP $($res.Status))"
  }

  return [pscustomobject]@{
    Token = [string]$token
    Id    = [string](Get-JsonProperty -Object $res.Body -Names @("id"))
    Email = [string](Get-JsonProperty -Object $res.Body -Names @("email"))
    Role  = [string](Get-JsonProperty -Object $res.Body -Names @("role"))
  }
}

Write-BannerLine "MangAfric API flow test"
Write-BannerLine ("Base URL : {0}" -f $BaseUrl)
Write-BannerLine ("API root : {0}" -f $ApiRoot)
Write-BannerLine ("Run id   : {0}" -f $RunId)

Write-Section "Health"
if (-not (Wait-ForHealth)) {
  Record-Result -Name "GET /health (wait)" -Status fail -Detail "API not reachable within ${HealthTimeoutSec}s"
  Write-Host ""
  Write-Host "Start the backend first, e.g.: cd backend/mangafrik; .\mvnw.cmd spring-boot:run" -ForegroundColor Yellow
  exit 1
}
Record-Result -Name "GET /health" -Status pass

Write-Section "Public catalog and assets"
Test-Endpoint -Name "GET /genres" -Method GET -Path "/genres"
$mangaList = Test-Endpoint -Name "GET /manga" -Method GET -Path "/manga" -PassThru
Test-Endpoint -Name "GET /manga/featured" -Method GET -Path "/manga/featured"
Test-Endpoint -Name "GET /manga/popular" -Method GET -Path "/manga/popular"
Test-Endpoint -Name "GET /manga/latest" -Method GET -Path "/manga/latest"
Test-Endpoint -Name "GET /store/coin-packs" -Method GET -Path "/store/coin-packs"
Test-Endpoint -Name "GET /ads/system-notices" -Method GET -Path "/ads/system-notices"
Test-Endpoint -Name "GET /assets/creator-panel-logo.png" -Method GET -Path "/assets/creator-panel-logo.png" -AllowedStatus @(200)

$mangaSlug = $null
$chapterNumber = $null
try {
  if ($mangaList -and $null -ne $mangaList.Body) {
    $items = Get-JsonItems -Body $mangaList.Body
    if (Test-CollectionNotEmpty $items) {
      $first = @($items)[0]
      $mangaSlug = [string](Get-JsonProperty -Object $first -Names @("slug", "Slug"))
      if ($mangaSlug -eq "") { $mangaSlug = $null }
    }
  }
} catch {
  Record-Result -Name "Parse manga catalog" -Status fail -Detail $_.Exception.Message
}

if ($mangaSlug) {
  Test-Endpoint -Name "GET /manga/{slug}" -Method GET -Path "/manga/$mangaSlug"
  $chapters = Test-Endpoint -Name "GET /manga/{slug}/chapters" -Method GET -Path "/manga/$mangaSlug/chapters" -PassThru
  try {
    if ($chapters -and $null -ne $chapters.Body) {
      $chapterItems = Get-JsonItems -Body $chapters.Body
      if (Test-CollectionNotEmpty $chapterItems) {
        $ch = @($chapterItems)[0]
        $num = Get-JsonProperty -Object $ch -Names @("number", "chapterNumber")
        if ($null -ne $num) { $chapterNumber = [int]$num }
      }
    }
  } catch {
    Record-Result -Name "Parse manga chapters" -Status fail -Detail $_.Exception.Message
  }
  if ($chapterNumber) {
    Test-Endpoint -Name "GET /manga/{slug}/chapters/{n}/pages (no auth)" -Method GET -Path "/manga/$mangaSlug/chapters/$chapterNumber/pages" -AllowedStatus @(401, 403)
  } else {
    Record-Result -Name "GET /manga/{slug}/chapters/{n}/pages (no auth)" -Status skip -Detail "no chapters in catalog"
  }
} else {
  Record-Result -Name "GET /manga/{slug}" -Status skip -Detail "catalog empty"
  Record-Result -Name "GET /manga/{slug}/chapters" -Status skip -Detail "catalog empty"
}

Write-Section "Auth flow"
$register = Test-Endpoint -Name "POST /auth/register" -Method POST -Path "/auth/register" -Body @{
  name     = $TestUserName
  email    = $TestUserEmail
  password = $TestUserPassword
  role     = "USER"
} -AllowedStatus @(200, 400)

$userSession = $null
$adminSession = $null

try {
  $userSession = Login -Email $TestUserEmail -Password $TestUserPassword
  Record-Result -Name "POST /auth/login (test user)" -Status pass
} catch {
  Record-Result -Name "POST /auth/login (test user)" -Status fail -Detail $_.Exception.Message
}

try {
  $adminSession = Login -Email $AdminEmail -Password $AdminPassword
  Record-Result -Name "POST /auth/login (admin)" -Status pass
} catch {
  Record-Result -Name "POST /auth/login (admin)" -Status fail -Detail $_.Exception.Message
}

Test-Endpoint -Name "POST /auth/forgot-password" -Method POST -Path "/auth/forgot-password" -Body @{
  email = $TestUserEmail
} -AllowedStatus @(200, 400)

if ($userSession) {
  Test-Endpoint -Name "POST /auth/change-password (same password rejected or ok)" -Method POST -Path "/auth/change-password" -Body @{
    email       = $TestUserEmail
    oldPassword = $TestUserPassword
    newPassword = $TestUserPassword
  } -AllowedStatus @(200, 400)
}

Write-Section "Authenticated user (wallet, store, unlocks)"
if ($userSession) {
  $userHeaders = Get-BearerHeaders $userSession.Token

  Test-Endpoint -Name "GET /wallet" -Method GET -Path "/wallet" -Headers $userHeaders
  Test-Endpoint -Name "GET /wallet/daily-claim/status" -Method GET -Path "/wallet/daily-claim/status" -Headers $userHeaders
  Test-Endpoint -Name "GET /wallet/referral" -Method GET -Path "/wallet/referral" -Headers $userHeaders
  Test-Endpoint -Name "GET /wallet/referral/pending" -Method GET -Path "/wallet/referral/pending" -Headers $userHeaders
  Test-Endpoint -Name "POST /wallet/daily-claim" -Method POST -Path "/wallet/daily-claim" -Headers $userHeaders -AllowedStatus @(200, 400, 409)

  $packs = Test-Endpoint -Name "POST /store/coin-purchase-intents" -Method POST -Path "/store/coin-purchase-intents" -Headers $userHeaders -Body @{ packId = "starter" } -AllowedStatus @(200, 400, 404)

  if ($mangaSlug) {
    Test-Endpoint -Name "POST /unlocks/manga" -Method POST -Path "/unlocks/manga" -Headers $userHeaders -Body @{ mangaSlug = $mangaSlug } -AllowedStatus @(200, 400, 402, 404)
    if ($chapterNumber) {
      Test-Endpoint -Name "POST /unlocks/chapter" -Method POST -Path "/unlocks/chapter" -Headers $userHeaders -Body @{
        mangaSlug     = $mangaSlug
        chapterNumber = $chapterNumber
      } -AllowedStatus @(200, 400, 402, 404)
    }
  } else {
    Record-Result -Name "POST /unlocks/manga" -Status skip -Detail "no manga slug"
  }

  if ($mangaSlug -and $chapterNumber) {
    Test-Endpoint -Name "GET /manga/{slug}/chapters/{n}/pages (auth)" -Method GET -Path "/manga/$mangaSlug/chapters/$chapterNumber/pages" -Headers $userHeaders -AllowedStatus @(200, 402, 403, 404)
  }

  Test-Endpoint -Name "GET /creator-requests/me (no request yet)" -Method GET -Path "/creator-requests/me" -Headers $userHeaders -AllowedStatus @(200)
  Test-Endpoint -Name "GET /admin/summary (user forbidden)" -Method GET -Path "/admin/summary" -Headers $userHeaders -AllowedStatus @(401, 403)
} else {
  Record-Result -Name "Authenticated user block" -Status skip -Detail "user login failed"
}

Write-Section "Public support and creator request"
$ticket = Test-Endpoint -Name "POST /support/public/tickets" -Method POST -Path "/support/public/tickets" -Body @{
  type        = "contact"
  subject     = "API flow test $RunId"
  description = "Automated smoke test ticket."
  name        = $TestUserName
  email       = $TestUserEmail
} -PassThru

$ticketId = $null
if ($ticket -and $ticket.Body) {
  $ticketId = [string](Get-JsonProperty -Object $ticket.Body -Names @("id"))
  if ($ticketId -eq "") { $ticketId = $null }
  if ($ticketId) {
    Test-Endpoint -Name "GET /support/public/tickets/{id}" -Method GET -Path "/support/public/tickets/$ticketId"
    Test-Endpoint -Name "GET /support/public/tickets/{id}/messages" -Method GET -Path "/support/public/tickets/$ticketId/messages"
    Test-Endpoint -Name "POST /support/public/tickets/{id}/messages" -Method POST -Path "/support/public/tickets/$ticketId/messages" -Body @{
      from = "user"
      text = "Follow-up from API flow test."
    }
  }
}

Test-Endpoint -Name "POST /creator-requests" -Method POST -Path "/creator-requests" -Body @{
  email        = $TestUserEmail
  creatorEmail = $TestUserEmail
  displayName  = $TestUserName
  penName      = "Pen$RunId"
  genres       = "action,fantasy"
  message      = "Creator request from API flow test."
} -AllowedStatus @(200, 400)

Write-Section "Admin read endpoints"
if ($adminSession) {
  $adminHeaders = Get-BearerHeaders $adminSession.Token

  Test-Endpoint -Name "GET /admin/summary" -Method GET -Path "/admin/summary" -Headers $adminHeaders
  Test-Endpoint -Name "GET /admin/audits" -Method GET -Path "/admin/audits" -Headers $adminHeaders
  Test-Endpoint -Name "GET /admin/users" -Method GET -Path "/admin/users" -Headers $adminHeaders
  Test-Endpoint -Name "GET /admin/creator-requests" -Method GET -Path "/admin/creator-requests" -Headers $adminHeaders
  Test-Endpoint -Name "GET /admin/manga-submissions" -Method GET -Path "/admin/manga-submissions" -Headers $adminHeaders
  Test-Endpoint -Name "GET /admin/manga-requests" -Method GET -Path "/admin/manga-requests" -Headers $adminHeaders
  Test-Endpoint -Name "GET /admin/mangas" -Method GET -Path "/admin/mangas" -Headers $adminHeaders
  Test-Endpoint -Name "GET /admin/feature-flags" -Method GET -Path "/admin/feature-flags" -Headers $adminHeaders

  Test-Endpoint -Name "GET /support/summary" -Method GET -Path "/support/summary" -Headers $adminHeaders
  Test-Endpoint -Name "GET /support/audits" -Method GET -Path "/support/audits" -Headers $adminHeaders
  Test-Endpoint -Name "GET /support/tickets" -Method GET -Path "/support/tickets" -Headers $adminHeaders
  if ($ticketId) {
    Test-Endpoint -Name "GET /support/tickets/{id}" -Method GET -Path "/support/tickets/$ticketId" -Headers $adminHeaders
    Test-Endpoint -Name "GET /support/tickets/{id}/messages" -Method GET -Path "/support/tickets/$ticketId/messages" -Headers $adminHeaders
  }

  Test-Endpoint -Name "GET /ads/summary" -Method GET -Path "/ads/summary" -Headers $adminHeaders
  Test-Endpoint -Name "GET /ads/audits" -Method GET -Path "/ads/audits" -Headers $adminHeaders
  Test-Endpoint -Name "GET /ads/hero-ads" -Method GET -Path "/ads/hero-ads" -Headers $adminHeaders
  Test-Endpoint -Name "GET /ads/notifications" -Method GET -Path "/ads/notifications" -Headers $adminHeaders
  Test-Endpoint -Name "GET /ads/manga-thumbnails/vertical" -Method GET -Path "/ads/manga-thumbnails/vertical" -Headers $adminHeaders

  Test-Endpoint -Name "GET /finance/summary" -Method GET -Path "/finance/summary" -Headers $adminHeaders
  Test-Endpoint -Name "GET /finance/transactions" -Method GET -Path "/finance/transactions" -Headers $adminHeaders

  Test-Endpoint -Name "GET /creator/submissions (role gate)" -Method GET -Path "/creator/submissions" -Headers $adminHeaders -AllowedStatus @(200, 403)
} else {
  Record-Result -Name "Admin read endpoints" -Status skip -Detail "admin login failed"
}

if ($IncludeEmailSend -and $adminSession) {
  Write-Section "Email (optional)"
  $adminHeaders = Get-BearerHeaders $adminSession.Token
  Test-Endpoint -Name "POST /email/send" -Method POST -Path "/email/send" -Headers $adminHeaders -Body @{
    to      = $TestUserEmail
    subject = "API flow test $RunId"
    text    = "If you receive this, SMTP is configured."
  } -AllowedStatus @(200, 500)
} else {
  Record-Result -Name "POST /email/send" -Status skip -Detail "pass -IncludeEmailSend to test SMTP"
}

if ($IncludeOpenApi) {
  Write-Section "OpenAPI"
  try {
    $docs = Invoke-WebRequest -Method GET -Uri ($BaseUrl.TrimEnd("/") + "/v3/api-docs") -UseBasicParsing
    if ($docs.StatusCode -eq 200) {
      Record-Result -Name "GET /v3/api-docs" -Status pass
    } else {
      Record-Result -Name "GET /v3/api-docs" -Status fail -Detail "HTTP $($docs.StatusCode)"
    }
  } catch {
    Record-Result -Name "GET /v3/api-docs" -Status fail -Detail $_.Exception.Message
  }
}

Write-Section "Summary"
Write-Host "Passed : $Passed"
Write-Host "Failed : $Failed"
Write-Host "Skipped: $Skipped"

if ($Failed -gt 0) {
  Write-Host ""
  Write-Host "Failures:" -ForegroundColor Red
  $script:Results | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
    Write-Host "  - $($_.Name): $($_.Detail)" -ForegroundColor Red
  }
  exit 1
}

Write-Host ""
Write-Host "All executed checks passed." -ForegroundColor Green
exit 0
