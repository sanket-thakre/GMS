# Starts the local portable PostgreSQL cluster on port 5433 (dev only).
# Usage:  powershell -ExecutionPolicy Bypass -File .\start_db.ps1
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$bin  = Join-Path $root ".pgsql\pgsql\bin"
$data = Join-Path $root ".pgdata"
$log  = Join-Path $root ".pg_logfile"

if (-not (Test-Path $bin))  { Write-Error "Portable Postgres not found at $bin"; exit 1 }
if (-not (Test-Path $data)) { Write-Error "Data dir not found at $data"; exit 1 }

$status = & (Join-Path $bin "pg_ctl.exe") -D $data status 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Output "PostgreSQL already running on port 5433."
} else {
    & (Join-Path $bin "pg_ctl.exe") -D $data -l $log -o "-p 5433" -w start
    Write-Output "PostgreSQL started on port 5433."
}
