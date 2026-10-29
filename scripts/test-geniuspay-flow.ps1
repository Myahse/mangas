<#
.SYNOPSIS
  Tests GeniusPay coin purchases end to end against a running backend and scripts/fake-geniuspay.py.

.DESCRIPTION
  Start the fake GeniusPay, then the API pointed at it:

    python scripts/fake-geniuspay.py 8099
    GENIUSPAY_BASE_URL=http://localhost:8099/api/v1/merchant GENIUSPAY_API_KEY=pk_sandbox_test
    GENIUSPAY_API_SECRET=sk_sandbox_test GENIUSPAY_WEBHOOK_SECRET=whsec_localtest  (then run the API)

  Checks: checkout link returned, unsigned / stale webhooks refused, a webhook alone never credits
  coins, a completed payment credits exactly once (duplicate webhooks + polling + admin mark-paid),
  wrong amounts are not credited, and failed payments close the intent.
  Turns "Coin payments" on for the run and restores the previous value afterwards.
#>
param(
  [string]$BaseUrl = $(if ($env:APP_PUBLIC_API_BASE_URL) { $env:APP_PUBLIC_API_BASE_URL } else { "http://localhost:8088" }),
  [string]$FakeGeniusPayUrl = "http://localhost:8099",
  [string]$WebhookSecret = $(if ($env:GENIUSPAY_WEBHOOK_SECRET) { $env:GENIUSPAY_WEBHOOK_SECRET } else { "whsec_localtest" }),
  [string]$AdminEmail = $(if ($env:APP_BOOTSTRAP_ADMIN_EMAIL) { $env:APP_BOOTSTRAP_ADMIN_EMAIL } else { "mangafric@gmail.com" }),
  [string]$AdminPassword = $env:APP_BOOTSTRAP_ADMIN_PASSWORD,
  [int]$HealthTimeoutSec = 90
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Admin password: -AdminPassword, else APP_BOOTSTRAP_ADMIN_PASSWORD, else the backend's untracked
# .env / .env.local (same order the API reads them). Never hard-coded.
function Read-BackendEnvValue([string]$Key) {
  $backendDir = Join-Path (Split-Path -Parent $PSScriptRoot) "backend\mangafrik"
  foreach ($name in @(".env", ".env.local")) {
    $file = Join-Path $backendDir $name
    if (-not (Test-Path -LiteralPath $file)) { continue }
    foreach ($line in Get-Content -LiteralPath $file) {
      if ($line -match "^\s*$([regex]::Escape($Key))\s*=\s*(.*)$") {
        $value = $Matches[1].Trim().Trim('"').Trim("'")
        if ($value) { return $value }
      }
    }
  }
  return ""
}
if (-not $AdminPassword) { $AdminPassword = Read-BackendEnvValue "APP_BOOTSTRAP_ADMIN_PASSWORD" }
if (-not $AdminPassword) {
  Write-Host "Admin password missing: pass -AdminPassword or set APP_BOOTSTRAP_ADMIN_PASSWORD (env or backend/mangafrik/.env)." -ForegroundColor Red
  exit 1
}

$ApiRoot = ($BaseUrl.TrimEnd("/")) + "/api/v1"
$RunId = [Guid]::NewGuid().ToString("N").Substring(0, 8)

$script:Passed = 0
$script:Failed = 0
$script:Skipped = 0
$script:Results = New-Object System.Collections.Generic.List[object]

function Write-Section([string]$Title) {
  [Console]::WriteLine()
  [Console]::WriteLine("== $Title ==")
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

function Check([string]$Name, [bool]$Condition, [string]$FailDetail = "", [string]$PassDetail = "") {
  if ($Condition) { Record-Result -Name $Name -Status pass -Detail $PassDetail }
  else { Record-Result -Name $Name -Status fail -Detail $FailDetail }
  return $Condition
}

function Invoke-Api {
  param(
    [Parameter(Mandatory = $true)][ValidateSet("GET", "POST", "PATCH", "PUT", "DELETE")]
    [string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )

  $uri = if ($Path.StartsWith("http")) { $Path } else { "$ApiRoot$Path" }
  $params = @{
    Method      = $Method
    Uri         = $uri
    Headers     = $Headers
    ContentType = "application/json; charset=utf-8"
  }
  if ($null -ne $Body) {
    $params.Body = [System.Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 12 -Compress))
  }

  # PowerShell 7 returns error responses directly; Windows PowerShell 5 throws them (handled in catch).
  if ($PSVersionTable.PSVersion.Major -ge 7) { $params.SkipHttpErrorCheck = $true }

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
      return [pscustomobject]@{ Status = 0; Body = $null; Error = $ex.Message }
    }
  }

  $parsed = $null
  if ($content) {
    try {
      $jsonParams = @{ InputObject = $content }
      if ($PSVersionTable.PSVersion.Major -ge 6) { $jsonParams.Depth = 12 }
      $parsed = ConvertFrom-Json @jsonParams
    } catch {
      $parsed = $content
    }
  }

  return [pscustomobject]@{ Status = $status; Body = $parsed; Error = "" }
}

function Get-JsonProperty {
  param([object]$Object, [string[]]$Names)

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

# Emits each item on the pipeline; wrap calls in @() to get an array.
function Get-JsonItems([object]$Body) {
  if ($null -eq $Body) { return }
  if ($Body -is [System.Array]) { return $Body }
  $items = Get-JsonProperty -Object $Body -Names @("items", "content", "data")
  if ($null -ne $items) { return $items }
  return $Body
}

function Format-Failure([object]$Res) {
  if ($Res.Status -eq 0) { return "request failed: $($Res.Error)" }
  $msg = Get-JsonProperty -Object $Res.Body -Names @("error", "message", "title")
  if ($msg) { return "HTTP $($Res.Status) - $msg" }
  return "HTTP $($Res.Status)"
}

function Get-BearerHeaders([string]$Token) {
  return @{ Authorization = "Bearer $Token" }
}

function Login([string]$Email, [string]$Password) {
  $res = Invoke-Api -Method POST -Path "/auth/login" -Body @{ email = $Email; password = $Password }
  $token = Get-JsonProperty -Object $res.Body -Names @("token")
  if ($res.Status -ne 200 -or -not $token) { return $null }
  return [pscustomobject]@{
    Token   = [string]$token
    Role    = [string](Get-JsonProperty -Object $res.Body -Names @("role"))
    Headers = Get-BearerHeaders ([string]$token)
  }
}

function Wait-ForHealth {
  $deadline = (Get-Date).AddSeconds($HealthTimeoutSec)
  while ((Get-Date) -lt $deadline) {
    $res = Invoke-Api -Method GET -Path "/health"
    if ($res.Status -eq 200) { return $true }
    Start-Sleep -Seconds 2
  }
  return $false
}

function New-Reader {
  $email = "flow-pay-$RunId@example.com"
  $password = "Flow!pay$RunId"
  $reg = Invoke-Api -Method POST -Path "/auth/register" -Body @{ name = "Flow pay $RunId"; email = $email; password = $password; role = "USER" }
  if ($reg.Status -ne 200) { return $null }
  return Login $email $password
}

function Get-Balance([object]$Session) {
  return [int](Get-JsonProperty (Invoke-Api -Method GET -Path "/wallet" -Headers $Session.Headers).Body @("balance"))
}

function New-Intent([object]$Session, [string]$PackId) {
  return Invoke-Api -Method POST -Path "/store/coin-purchase-intents" -Headers $Session.Headers -Body @{ packId = $PackId }
}

function Get-Intent([object]$Session, [string]$Id) {
  return Invoke-Api -Method GET -Path "/store/coin-purchase-intents/$Id" -Headers $Session.Headers
}

function Set-FakePayment([string]$Reference, [hashtable]$Fields) {
  return Invoke-Api -Method POST -Path "$($FakeGeniusPayUrl.TrimEnd('/'))/_test/payments/$Reference/status" -Body $Fields
}

# Sends a GeniusPay-style webhook; signs it unless -Signature is given. The body claims a big
# completed payment on purpose: the backend must ignore it and ask GeniusPay instead.
function Send-Webhook([string]$Event, [string]$Reference, [string]$Signature = "", [long]$Timestamp = 0) {
  if ($Timestamp -eq 0) { $Timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() }
  $payload = @{ id = "evt_$RunId"; event = $Event; timestamp = $Timestamp; data = @{ object = "transaction"; reference = $Reference; status = "completed"; amount = 999999 } }
  $bytes = [System.Text.Encoding]::UTF8.GetBytes(($payload | ConvertTo-Json -Depth 5 -Compress))
  if (-not $Signature) {
    $hmac = New-Object System.Security.Cryptography.HMACSHA256 (, [System.Text.Encoding]::UTF8.GetBytes($WebhookSecret))
    $signed = [byte[]]([System.Text.Encoding]::UTF8.GetBytes("$Timestamp.") + $bytes)
    $Signature = (($hmac.ComputeHash($signed) | ForEach-Object { $_.ToString("x2") }) -join "")
  }
  $params = @{
    Method = "POST"; Uri = "$ApiRoot/payments/geniuspay/webhook"; ContentType = "application/json"; Body = $bytes
    Headers = @{ "X-Webhook-Signature" = $Signature; "X-Webhook-Timestamp" = "$Timestamp"; "X-Webhook-Event" = $Event }
  }
  if ($PSVersionTable.PSVersion.Major -ge 7) { $params.SkipHttpErrorCheck = $true }
  try { return [int](Invoke-WebRequest @params -UseBasicParsing).StatusCode }
  catch { if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode.value__ } return 0 }
}

function Intent-Status([object]$Res) { return [string](Get-JsonProperty $Res.Body @("status")) }

Write-Section "Setup"
if (-not (Check "API is healthy" (Wait-ForHealth) "no /health response")) { exit 1 }
$fake = Invoke-Api -Method GET -Path "$($FakeGeniusPayUrl.TrimEnd('/'))/api/v1/merchant/payments/none"
if (-not (Check "Fake GeniusPay is running" ($fake.Status -in @(401, 404)) "start: python scripts/fake-geniuspay.py 8099")) { exit 1 }
$admin = Login $AdminEmail $AdminPassword
if (-not (Check "Admin signs in" ($null -ne $admin) "login failed for $AdminEmail")) { exit 1 }
$flags = (Invoke-Api -Method GET -Path "/admin/feature-flags" -Headers $admin.Headers).Body
$paymentsWereOn = [bool](Get-JsonProperty $flags @("coins.payments.enabled"))
Invoke-Api -Method PATCH -Path "/admin/feature-flags" -Headers $admin.Headers -Body @{ key = "coins.payments.enabled"; enabled = $true } | Out-Null
$reader = New-Reader
if (-not (Check "Reader account created" ($null -ne $reader) "register/login failed")) { exit 1 }

try {
  Write-Section "Checkout"
  $start = Get-Balance $reader
  $res = New-Intent $reader "pack_50"
  $intentId = [string](Get-JsonProperty $res.Body @("id"))
  $ref = [string](Get-JsonProperty $res.Body @("providerRef"))
  $isCheckout = $res.Status -eq 200 -and (Get-JsonProperty $res.Body @("provider")) -eq "geniuspay" -and [bool](Get-JsonProperty $res.Body @("checkoutUrl")) -and [bool]$ref
  if (-not (Check "Purchase opens a GeniusPay checkout" $isCheckout (Format-Failure $res) $ref)) { throw "no checkout; is the API running with GENIUSPAY_* set?" }

  Write-Section "Webhook security"
  Check "Badly signed webhook is refused" ((Send-Webhook "payment.success" $ref "deadbeef") -eq 401) | Out-Null
  $old = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() - 600
  Check "Webhook older than 5 minutes is refused" ((Send-Webhook "payment.success" $ref "" $old) -eq 401) | Out-Null
  Check "Signed webhook is accepted" ((Send-Webhook "payment.success" $ref) -eq 200) | Out-Null
  Check "Webhook alone credits nothing while GeniusPay says pending" ((Intent-Status (Get-Intent $reader $intentId)) -eq "pending" -and (Get-Balance $reader) -eq $start) | Out-Null

  Write-Section "Payment completed"
  Set-FakePayment $ref @{ status = "completed" } | Out-Null
  $codes = @(1..3 | ForEach-Object { Send-Webhook "payment.success" $ref })
  Check "Duplicate webhooks all acknowledged" (@($codes | Where-Object { $_ -ne 200 }).Count -eq 0) ("codes: " + ($codes -join ",")) | Out-Null
  $poll = Get-Intent $reader $intentId
  $mark = Invoke-Api -Method POST -Path "/admin/store/coin-purchase-intents/$intentId/mark-paid" -Headers $admin.Headers
  $bal = Get-Balance $reader
  Check "Intent is paid" ((Intent-Status $poll) -eq "paid") (Format-Failure $poll) | Out-Null
  Check "Admin mark-paid on a paid intent is harmless" ($mark.Status -eq 200) (Format-Failure $mark) | Out-Null
  Check "Coins credited exactly once" ($bal -eq $start + 50) "balance $start -> $bal" "balance $start -> $bal" | Out-Null

  Write-Section "Return-page polling (no webhook)"
  $i2 = (New-Intent $reader "pack_120").Body
  Set-FakePayment ([string](Get-JsonProperty $i2 @("providerRef"))) @{ status = "completed" } | Out-Null
  $p2 = Get-Intent $reader ([string](Get-JsonProperty $i2 @("id")))
  $bal = Get-Balance $reader
  Check "Polling confirms the payment" ((Intent-Status $p2) -eq "paid" -and $bal -eq $start + 170) "status $(Intent-Status $p2), balance $bal" | Out-Null

  Write-Section "Wrong amount and failures"
  $i3 = (New-Intent $reader "pack_300").Body
  $ref3 = [string](Get-JsonProperty $i3 @("providerRef"))
  Set-FakePayment $ref3 @{ status = "completed"; amount = 200 } | Out-Null
  Send-Webhook "payment.success" $ref3 | Out-Null
  $p3 = Get-Intent $reader ([string](Get-JsonProperty $i3 @("id")))
  Check "Underpaid payment is not credited" ((Intent-Status $p3) -eq "pending" -and (Get-Balance $reader) -eq $start + 170) | Out-Null

  $i4 = (New-Intent $reader "pack_50").Body
  $ref4 = [string](Get-JsonProperty $i4 @("providerRef"))
  Set-FakePayment $ref4 @{ status = "failed" } | Out-Null
  Send-Webhook "payment.failed" $ref4 | Out-Null
  Check "Failed payment closes the intent" ((Intent-Status (Get-Intent $reader ([string](Get-JsonProperty $i4 @("id"))))) -eq "failed") | Out-Null

  Check "Unknown reference is ignored" ((Send-Webhook "payment.success" "MTX-UNKNOWN") -eq 200) | Out-Null
  $other = Get-Intent $admin $intentId
  Check "Users cannot read someone else's purchase" ($other.Status -eq 404) "HTTP $($other.Status)" | Out-Null
} finally {
  Write-Section "Cleanup"
  Invoke-Api -Method PATCH -Path "/admin/feature-flags" -Headers $admin.Headers -Body @{ key = "coins.payments.enabled"; enabled = $paymentsWereOn } | Out-Null
  $u = @(Get-JsonItems (Invoke-Api -Method GET -Path "/admin/users" -Headers $admin.Headers).Body) |
    Where-Object { ([string](Get-JsonProperty $_ @("email"))) -eq "flow-pay-$RunId@example.com" } | Select-Object -First 1
  if ($u) {
    $d = Invoke-Api -Method PATCH -Path "/admin/users/$(Get-JsonProperty $u @('id'))" -Headers $admin.Headers -Body @{ status = "disabled" }
    Check "Disable test reader" ($d.Status -eq 200) (Format-Failure $d) | Out-Null
  }
}

Write-Section "Summary"
Write-Host "Passed : $script:Passed"
Write-Host "Failed : $script:Failed"
if ($script:Failed -gt 0) {
  $script:Results | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object { Write-Host "  - $($_.Name): $($_.Detail)" -ForegroundColor Red }
  exit 1
}
Write-Host ""
Write-Host "GeniusPay coin purchases work." -ForegroundColor Green
exit 0
