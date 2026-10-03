<#
.SYNOPSIS
  Start local PostgreSQL (and optional RabbitMQ) for MangAfric API dev.

.EXAMPLE
  .\scripts\start-db.ps1
  .\scripts\start-db.ps1 -PostgresOnly
#>
param(
  [switch]$PostgresOnly
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$compose = Join-Path $root 'backend\mangafrik\compose.yaml'

if (-not (Test-Path -LiteralPath $compose)) {
  throw "Missing compose file: $compose"
}

$services = if ($PostgresOnly) { @('postgres') } else { @('postgres', 'rabbitmq') }
Write-Host "Starting: $($services -join ', ')" -ForegroundColor Cyan
docker compose -f $compose up -d @services
Write-Host "DATABASE_URL (from .env): postgresql://mangafriq:***@localhost:5432/mangafriq" -ForegroundColor Green
