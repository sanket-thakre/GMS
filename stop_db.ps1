# Stops the local portable PostgreSQL cluster (dev only).
# Usage:  powershell -ExecutionPolicy Bypass -File .\stop_db.ps1
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$bin  = Join-Path $root ".pgsql\pgsql\bin"
$data = Join-Path $root ".pgdata"

& (Join-Path $bin "pg_ctl.exe") -D $data -m fast stop
Write-Output "PostgreSQL stopped."
