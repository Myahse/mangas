<#
.SYNOPSIS
  End-to-end test of how a manga travels across MangAfric apps, plus the support loop.

.DESCRIPTION
  Walks the same API calls each panel makes, in order, against a running backend:

    1. Accounts   - registers a throwaway reader, creator and support agent; admin assigns roles.
    2. Creator    - creator submits a series (creator-panel).
    3. Admin      - admin sees the submission and approves it (admin-panel).
    4. Catalog    - series appears in the public catalog (front / mobile reader).
    5. Episode    - creator publishes episode 1; it syncs into catalog chapters and pages.
    6. Reader     - reader opens chapter 1 pages; the creator sees the submission as approved.
    7. Ads        - series shows in the ads panel's thumbnail picker.
    8. Support    - reader opens a ticket, support agent replies and validates it, reader sees the reply.
    9. Role gates - each role is refused on panels it does not own.
   10. Cleanup    - removes the test series from the catalog and disables the test accounts.

  By default nothing is uploaded: episode pages reuse an image already in storage, because
  uploads go to the configured R2 bucket. Pass -IncludeUpload to also test /storage/upload.

  Requires the Spring Boot API to be running (default http://localhost:8088).

.EXAMPLE
  .\scripts\test-manga-flow.cmd

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\test-manga-flow.ps1 -KeepData
#>
param(
  [string]$BaseUrl = $(if ($env:APP_PUBLIC_API_BASE_URL) { $env:APP_PUBLIC_API_BASE_URL } else { "http://localhost:8088" }),
  [string]$AdminEmail = $(if ($env:APP_BOOTSTRAP_ADMIN_EMAIL) { $env:APP_BOOTSTRAP_ADMIN_EMAIL } else { "mangafric@gmail.com" }),
  [string]$AdminPassword = $env:APP_BOOTSTRAP_ADMIN_PASSWORD,
  [int]$HealthTimeoutSec = 90,
  [switch]$IncludeUpload,
  [switch]$KeepData
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
$SeriesTitle = "Flow Test $RunId"
$EpisodeTitle = "Episode 1"

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

# Registers a throwaway account and, when Role is not reader, has the admin promote it.
function New-TestAccount([string]$Label, [string]$Role, [object]$Admin) {
  $email = "flow-$Label-$RunId@example.com"
  $password = "Flow!$Label$RunId"
  $reg = Invoke-Api -Method POST -Path "/auth/register" -Body @{
    name = "Flow $Label $RunId"; email = $email; password = $password; role = "USER"
  }
  if ($reg.Status -ne 200) {
    Record-Result -Name "Register $Label" -Status fail -Detail (Format-Failure $reg)
    return $null
  }

  if ($Role -ne "reader") {
    $users = Invoke-Api -Method GET -Path "/admin/users" -Headers $Admin.Headers
    $user = @(Get-JsonItems $users.Body) | Where-Object { (Get-JsonProperty $_ @("email")) -eq $email } | Select-Object -First 1
    if (-not $user) {
      Record-Result -Name "Promote $Label to $Role" -Status fail -Detail "user not found in /admin/users"
      return $null
    }
    $patch = Invoke-Api -Method PATCH -Path "/admin/users/$(Get-JsonProperty $user @('id'))" -Headers $Admin.Headers -Body @{ role = $Role }
    if ($patch.Status -ne 200) {
      Record-Result -Name "Promote $Label to $Role" -Status fail -Detail (Format-Failure $patch)
      return $null
    }
  }

  $session = Login $email $password
  if (-not (Check "Account $Label signs in as $Role" ($null -ne $session -and $session.Role -eq $Role) `
        ("role after login: " + $(if ($session) { $session.Role } else { "login failed" })))) {
    return $null
  }
  $session | Add-Member -NotePropertyName Email -NotePropertyValue $email
  return $session
}

function Find-CatalogManga([string]$Title) {
  $list = Invoke-Api -Method GET -Path "/manga"
  return @(Get-JsonItems $list.Body) | Where-Object { (Get-JsonProperty $_ @("title")) -eq $Title } | Select-Object -First 1
}

Write-Host "MangAfric cross-app manga flow test"
Write-Host ("API root : {0}" -f $ApiRoot)
Write-Host ("Run id   : {0}" -f $RunId)
Write-Host ("Series   : {0}" -f $SeriesTitle)

Write-Section "1. Accounts"
if (-not (Wait-ForHealth)) {
  Record-Result -Name "GET /health" -Status fail -Detail "API not reachable within ${HealthTimeoutSec}s"
  Write-Host "Start the backend first, e.g.: cd backend/mangafrik; .\mvnw.cmd spring-boot:run" -ForegroundColor Yellow
  exit 1
}
Record-Result -Name "GET /health" -Status pass

$admin = Login $AdminEmail $AdminPassword
if (-not (Check "Admin signs in" ($null -ne $admin -and $admin.Role -eq "admin") "check -AdminEmail / -AdminPassword")) {
  exit 1
}
$reader = New-TestAccount "reader" "reader" $admin
$creator = New-TestAccount "creator" "creator" $admin
$support = New-TestAccount "support" "support" $admin
$otherCreator = New-TestAccount "creator2" "creator" $admin

# The admin role is also allowed on /creator/** and /support/**, so it stands in for an account
# that could not be promoted; the flow keeps going and the promotion failure stays reported.
$creatorActor = if ($creator) { $creator } else { $admin }
$supportActor = if ($support) { $support } else { $admin }
if (-not $creator) { Record-Result -Name "Creator steps run as admin" -Status skip -Detail "creator account unavailable" }
if (-not $support) { Record-Result -Name "Support steps run as admin" -Status skip -Detail "support account unavailable" }
$creatorActor | Add-Member -NotePropertyName Email -NotePropertyValue $(if ($creator) { $creatorActor.Email } else { $AdminEmail }) -Force

# Page image: reuse an image already in storage so the run does not write to the bucket.
$existing = @(Get-JsonItems (Invoke-Api -Method GET -Path "/manga").Body) |
  Where-Object { Get-JsonProperty $_ @("cover", "coverUrl", "thumbnail") } | Select-Object -First 1
$pageUrl = if ($existing) { [string](Get-JsonProperty $existing @("cover", "coverUrl", "thumbnail")) } else { "$ApiRoot/storage/flow-test/$RunId/page-1.jpg" }

if ($IncludeUpload -and $creatorActor) {
  Write-Section "Upload (optional)"
  $tmp = Join-Path ([IO.Path]::GetTempPath()) "flow-$RunId.png"
  # 1x1 PNG
  [IO.File]::WriteAllBytes($tmp, [Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="))
  try {
    $form = @{ file = Get-Item $tmp }
    $up = Invoke-RestMethod -Method POST -Uri "$ApiRoot/storage/upload?prefix=flow-test/$RunId&normalize=episode_page" -Headers $creatorActor.Headers -Form $form
    $upUrl = [string](Get-JsonProperty $up @("url", "publicUrl"))
    if (Check "POST /storage/upload (normalized page)" ([bool]$upUrl) "no url in response") { $pageUrl = $upUrl }
  } catch {
    Record-Result -Name "POST /storage/upload (normalized page)" -Status fail -Detail $_.Exception.Message
  } finally {
    Remove-Item $tmp -ErrorAction SilentlyContinue
  }
}

Write-Section "2. Creator submits the series (creator-panel)"
$submissionId = $null
if ($creatorActor) {
  $sub = Invoke-Api -Method POST -Path "/creator/submissions" -Headers $creatorActor.Headers -Body @{
    creatorEmail       = $creatorActor.Email
    creatorDisplayName = "Flow creator $RunId"
    payload            = @{
      title      = $SeriesTitle
      summary    = "Automated cross-app flow test series."
      category1  = "Action"
      # Same shape as creator-panel SeriesPage: the vertical thumb also travels as a data URL for the ads panel.
      thumbnails = @{
        square   = @{ url = $pageUrl }
        vertical = @{ url = $pageUrl; dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==" }
      }
    }
  }
  $submissionId = [string](Get-JsonProperty $sub.Body @("id"))
  Check "POST /creator/submissions" ($sub.Status -eq 200 -and $submissionId) (Format-Failure $sub) | Out-Null

  $mine = Invoke-Api -Method GET -Path "/creator/submissions" -Headers $creatorActor.Headers
  $mineRow = @(Get-JsonItems $mine.Body) | Where-Object { (Get-JsonProperty $_ @("id")) -eq $submissionId } | Select-Object -First 1
  Check "Creator sees own submission as pending" ($mineRow -and (Get-JsonProperty $mineRow @("status")) -eq "pending") `
    ("status: " + $(if ($mineRow) { Get-JsonProperty $mineRow @("status") } else { "not listed" })) | Out-Null

  Check "Series is not public before review" ($null -eq (Find-CatalogManga $SeriesTitle)) "already in /manga" | Out-Null
} else {
  Record-Result -Name "Creator steps" -Status skip -Detail "creator account unavailable"
}

Write-Section "3. Admin reviews it (admin-panel)"
if ($submissionId) {
  $queue = Invoke-Api -Method GET -Path "/admin/manga-submissions" -Headers $admin.Headers
  $queued = @(Get-JsonItems $queue.Body) | Where-Object { (Get-JsonProperty $_ @("id")) -eq $submissionId }
  Check "Submission appears in admin moderation queue" ([bool]$queued) (Format-Failure $queue) | Out-Null

  $review = Invoke-Api -Method POST -Path "/admin/manga-submissions/$submissionId/review" -Headers $admin.Headers -Body @{
    decision = "approved"; reason = "Flow test approval"
  }
  Check "POST /admin/manga-submissions/{id}/review approved" ($review.Status -eq 200) (Format-Failure $review) | Out-Null
} else {
  Record-Result -Name "Admin review" -Status skip -Detail "no submission"
}

Write-Section "4. Series is public (front / mobile reader)"
$slug = $null
$catalogRow = Find-CatalogManga $SeriesTitle
if (Check "Series listed in GET /manga" ($null -ne $catalogRow) "not found by title") {
  $slug = [string](Get-JsonProperty $catalogRow @("slug"))
  $detail = Invoke-Api -Method GET -Path "/manga/$slug"
  Check "GET /manga/{slug}" ($detail.Status -eq 200) (Format-Failure $detail) "slug $slug" | Out-Null
  $latest = Invoke-Api -Method GET -Path "/manga/latest?count=50"
  Check "Series listed in GET /manga/latest" ([bool](@(Get-JsonItems $latest.Body) | Where-Object { (Get-JsonProperty $_ @("slug")) -eq $slug })) "not in latest 50" | Out-Null
}

Write-Section "5. Creator publishes episode 1 (creator-panel)"
if ($creatorActor -and $slug) {
  $pub = Invoke-Api -Method POST -Path "/creator/episodes/published" -Headers $creatorActor.Headers -Body @{
    seriesTitle     = $SeriesTitle
    episodeTitle    = $EpisodeTitle
    commentsEnabled = $true
    thumb           = @{ url = $pageUrl }
    images          = @(@{ url = $pageUrl; name = "page-1.jpg" }, @{ url = $pageUrl; name = "page-2.jpg" })
  }
  Check "POST /creator/episodes/published" ($pub.Status -eq 200) (Format-Failure $pub) | Out-Null

  $chapters = Invoke-Api -Method GET -Path "/manga/$slug/chapters"
  $chapterItems = @(Get-JsonItems $chapters.Body)
  Check "Episode synced into catalog chapters" ($chapters.Status -eq 200 -and $chapterItems.Count -ge 1) `
    ("chapters: $($chapterItems.Count) / " + (Format-Failure $chapters)) "$($chapterItems.Count) chapter(s)" | Out-Null
} else {
  Record-Result -Name "Episode publish" -Status skip -Detail "series not public"
}

Write-Section "5b. Creators are kept apart (creator-panel)"
if ($creator -and $otherCreator -and $slug) {
  $own = Invoke-Api -Method GET -Path "/creator/episodes/published" -Headers $creator.Headers
  Check "Creator lists own published episode" ([bool](@(Get-JsonItems $own.Body) | Where-Object { (Get-JsonProperty $_ @("seriesTitle")) -eq $SeriesTitle })) (Format-Failure $own) | Out-Null

  $theirs = Invoke-Api -Method GET -Path "/creator/episodes/published" -Headers $otherCreator.Headers
  Check "Other creator does not see it" ($theirs.Status -eq 200 -and -not (@(Get-JsonItems $theirs.Body) | Where-Object { (Get-JsonProperty $_ @("seriesTitle")) -eq $SeriesTitle })) (Format-Failure $theirs) | Out-Null

  $hijack = Invoke-Api -Method POST -Path "/creator/episodes/published" -Headers $otherCreator.Headers -Body @{
    seriesTitle = $SeriesTitle; episodeTitle = "Not mine"; images = @(@{ url = $pageUrl })
  }
  Check "Other creator cannot publish into the series" ($hijack.Status -eq 403) "got HTTP $($hijack.Status)" | Out-Null
  $chaptersAfter = @(Get-JsonItems (Invoke-Api -Method GET -Path "/manga/$slug/chapters").Body)
  Check "Catalog still has only the owner's chapter" ($chaptersAfter.Count -eq 1) "chapters: $($chaptersAfter.Count)" | Out-Null

  $draft = Invoke-Api -Method POST -Path "/creator/episodes/drafts" -Headers $creator.Headers -Body @{ seriesTitle = $SeriesTitle; episodeTitle = "Draft 2" }
  $draftId = [string](Get-JsonProperty $draft.Body @("id"))
  $otherDrafts = Invoke-Api -Method GET -Path "/creator/episodes/drafts" -Headers $otherCreator.Headers
  Check "Other creator does not see the draft" ($draftId -and -not (@(Get-JsonItems $otherDrafts.Body) | Where-Object { (Get-JsonProperty $_ @("id")) -eq $draftId })) (Format-Failure $otherDrafts) | Out-Null
  $staffDrafts = Invoke-Api -Method GET -Path "/admin/creator-episodes/drafts" -Headers $admin.Headers
  Check "Admin still sees every draft" ([bool](@(Get-JsonItems $staffDrafts.Body) | Where-Object { (Get-JsonProperty $_ @("id")) -eq $draftId })) (Format-Failure $staffDrafts) | Out-Null
} else {
  Record-Result -Name "Creator isolation" -Status skip -Detail "needs two creator accounts and a public series"
}

Write-Section "6. Reader opens the chapter (front / mobile reader)"
if ($slug) {
  $anon = Invoke-Api -Method GET -Path "/manga/$slug/chapters/1/pages"
  Check "Chapter pages need sign-in" ($anon.Status -eq 401 -or $anon.Status -eq 403) "got HTTP $($anon.Status)" | Out-Null
  if ($reader) {
    $pages = Invoke-Api -Method GET -Path "/manga/$slug/chapters/1/pages" -Headers $reader.Headers
    $pageItems = @(Get-JsonItems $pages.Body)
    Check "Reader gets chapter 1 pages" ($pages.Status -eq 200 -and $pageItems.Count -eq 2) `
      ("pages: $($pageItems.Count) / " + (Format-Failure $pages)) "$($pageItems.Count) page(s)" | Out-Null
    $view = Invoke-Api -Method POST -Path "/manga/$slug/chapters/1/view" -Headers $reader.Headers
    Check "Reader view is recorded" ($view.Status -eq 200) (Format-Failure $view) | Out-Null

    # "Reprendre la lecture": the reader stops on page 1 of 2, then finishes the (only) chapter.
    $save = Invoke-Api -Method PUT -Path "/reading-progress/$slug" -Headers $reader.Headers -Body @{ chapterNumber = 1; page = 0; pageCount = 2 }
    $resume = @(Get-JsonItems (Invoke-Api -Method GET -Path "/reading-progress" -Headers $reader.Headers).Body) |
      Where-Object { (Get-JsonProperty $_ @("slug")) -eq $slug } | Select-Object -First 1
    Check "Reading position is saved for 'Reprendre la lecture'" ($save.Status -eq 200 -and $resume -and (Get-JsonProperty $resume @("resumeChapter")) -eq 1 -and (Get-JsonProperty $resume @("resumePage")) -eq 0) `
      (Format-Failure $save) | Out-Null
    Invoke-Api -Method PUT -Path "/reading-progress/$slug" -Headers $reader.Headers -Body @{ chapterNumber = 1; page = 1; pageCount = 2 } | Out-Null
    $done = @(Get-JsonItems (Invoke-Api -Method GET -Path "/reading-progress" -Headers $reader.Headers).Body) |
      Where-Object { (Get-JsonProperty $_ @("slug")) -eq $slug } | Select-Object -First 1
    Check "Finishing the latest chapter marks the reader as caught up" ($done -and (Get-JsonProperty $done @("caughtUp")) -eq $true) | Out-Null
  }
}
if ($creatorActor -and $submissionId) {
  $mine = Invoke-Api -Method GET -Path "/creator/submissions" -Headers $creatorActor.Headers
  $mineRow = @(Get-JsonItems $mine.Body) | Where-Object { (Get-JsonProperty $_ @("id")) -eq $submissionId } | Select-Object -First 1
  Check "Creator sees submission as approved" ($mineRow -and (Get-JsonProperty $mineRow @("status")) -eq "approved") `
    ("status: " + $(if ($mineRow) { Get-JsonProperty $mineRow @("status") } else { "not listed" })) | Out-Null
}

Write-Section "7. Ads panel sees the series"
if ($submissionId) {
  $thumbs = Invoke-Api -Method GET -Path "/ads/manga-thumbnails/vertical" -Headers $admin.Headers
  $found = @(Get-JsonItems $thumbs.Body) | Where-Object { (Get-JsonProperty $_ @("submissionId")) -eq $submissionId }
  Check "Series offered in GET /ads/manga-thumbnails/vertical" ($thumbs.Status -eq 200 -and [bool]$found) `
    ("not listed / " + (Format-Failure $thumbs)) | Out-Null
}

Write-Section "8. Support loop (front contact page -> support-panel)"
$ticketId = $null
$ticket = Invoke-Api -Method POST -Path "/support/public/tickets" -Body @{
  type        = "contact"
  subject     = "Flow test $RunId"
  description = "Cannot find chapter 2 of $SeriesTitle."
  name        = "Flow reader $RunId"
  email       = $(if ($reader) { $reader.Email } else { "flow-reader-$RunId@example.com" })
}
$ticketId = [string](Get-JsonProperty $ticket.Body @("id"))
Check "Reader opens a support ticket" ($ticket.Status -eq 200 -and $ticketId) (Format-Failure $ticket) | Out-Null

if ($ticketId -and $supportActor) {
  $inbox = Invoke-Api -Method GET -Path "/support/tickets" -Headers $supportActor.Headers
  Check "Ticket appears in support inbox" ([bool](@(Get-JsonItems $inbox.Body) | Where-Object { (Get-JsonProperty $_ @("id")) -eq $ticketId })) (Format-Failure $inbox) | Out-Null

  $replyText = "Chapter 2 is coming soon ($RunId)."
  $reply = Invoke-Api -Method POST -Path "/support/tickets/$ticketId/messages" -Headers $supportActor.Headers -Body @{ from = "support"; text = $replyText }
  Check "Support agent replies" ($reply.Status -eq 200) (Format-Failure $reply) | Out-Null

  $thread = Invoke-Api -Method GET -Path "/support/public/tickets/$ticketId/messages"
  Check "Reader sees the support reply" ([bool](@(Get-JsonItems $thread.Body) | Where-Object { (Get-JsonProperty $_ @("text")) -eq $replyText })) (Format-Failure $thread) | Out-Null

  $validate = Invoke-Api -Method POST -Path "/support/tickets/$ticketId/validate" -Headers $supportActor.Headers -Body @{ note = "Answered by flow test" }
  Check "Support validates the ticket" ($validate.Status -eq 200 -and (Get-JsonProperty $validate.Body @("status")) -eq "validated") (Format-Failure $validate) | Out-Null

  $public = Invoke-Api -Method GET -Path "/support/public/tickets/$ticketId"
  Check "Reader sees ticket as validated" ((Get-JsonProperty $public.Body @("status")) -eq "validated") `
    ("status: " + (Get-JsonProperty $public.Body @("status"))) | Out-Null
} elseif ($ticketId) {
  Record-Result -Name "Support agent steps" -Status skip -Detail "support account unavailable"
}

Write-Section "9. Role gates"
$gates = @(
  @{ Who = $reader;  Label = "reader";  Path = "/creator/submissions"; Expect = "deny" },
  @{ Who = $reader;  Label = "reader";  Path = "/support/tickets";     Expect = "deny" },
  @{ Who = $creator; Label = "creator"; Path = "/admin/summary";       Expect = "deny" },
  @{ Who = $creator; Label = "creator"; Path = "/finance/summary";     Expect = "deny" },
  @{ Who = $support; Label = "support"; Path = "/support/summary";     Expect = "allow" },
  @{ Who = $support; Label = "support"; Path = "/admin/summary";       Expect = "deny" },
  @{ Who = $support; Label = "support"; Path = "/finance/summary";     Expect = "deny" },
  @{ Who = $admin;   Label = "admin";   Path = "/finance/summary";     Expect = "allow" },
  @{ Who = $admin;   Label = "admin";   Path = "/ads/summary";         Expect = "allow" }
)
foreach ($g in $gates) {
  $name = "$($g.Label) $($g.Expect)ed on $($g.Path)"
  if (-not $g.Who) { Record-Result -Name $name -Status skip -Detail "account unavailable"; continue }
  $res = Invoke-Api -Method GET -Path $g.Path -Headers $g.Who.Headers
  $ok = if ($g.Expect -eq "allow") { $res.Status -eq 200 } else { $res.Status -eq 401 -or $res.Status -eq 403 }
  Check $name $ok "got HTTP $($res.Status)" | Out-Null
}

Write-Section "10. Cleanup"
if ($KeepData) {
  Record-Result -Name "Cleanup" -Status skip -Detail "-KeepData: series '$SeriesTitle' left in catalog"
} else {
  if ($slug) {
    $mangas = Invoke-Api -Method GET -Path "/admin/mangas" -Headers $admin.Headers
    $row = @(Get-JsonItems $mangas.Body) | Where-Object { (Get-JsonProperty $_ @("slug")) -eq $slug } | Select-Object -First 1
    if ($row) {
      $del = Invoke-Api -Method DELETE -Path "/admin/mangas/$(Get-JsonProperty $row @('id'))" -Headers $admin.Headers
      Check "Remove test series from catalog" ($del.Status -eq 200 -and $null -eq (Find-CatalogManga $SeriesTitle)) (Format-Failure $del) | Out-Null
    } else {
      Record-Result -Name "Remove test series from catalog" -Status fail -Detail "slug not in /admin/mangas"
    }
  }
  $users = @(Get-JsonItems (Invoke-Api -Method GET -Path "/admin/users" -Headers $admin.Headers).Body) |
    Where-Object { ([string](Get-JsonProperty $_ @("email"))) -like "flow-*-$RunId@example.com" }
  $disabled = 0
  foreach ($u in $users) {
    $res = Invoke-Api -Method PATCH -Path "/admin/users/$(Get-JsonProperty $u @('id'))" -Headers $admin.Headers -Body @{ status = "disabled" }
    if ($res.Status -eq 200) { $disabled++ }
  }
  Check "Disable test accounts" ($disabled -eq @($users).Count) "$disabled of $(@($users).Count) disabled" "$disabled account(s)" | Out-Null
}

Write-Section "Summary"
Write-Host "Passed : $script:Passed"
Write-Host "Failed : $script:Failed"
Write-Host "Skipped: $script:Skipped"

if ($script:Failed -gt 0) {
  Write-Host ""
  Write-Host "Failures:" -ForegroundColor Red
  $script:Results | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
    Write-Host "  - $($_.Name): $($_.Detail)" -ForegroundColor Red
  }
  exit 1
}

Write-Host ""
Write-Host "Manga flow and support loop work across apps." -ForegroundColor Green
exit 0
