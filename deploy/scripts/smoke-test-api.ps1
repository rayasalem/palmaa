# Smoke-test API (PowerShell). Usage:
#   $env:API_BASE = "https://api.palma.ps"
#   .\deploy\scripts\smoke-test-api.ps1

$ErrorActionPreference = "Stop"
$base = if ($env:API_BASE) { $env:API_BASE } else { "https://api.palma.ps" }
Write-Host "Testing API_BASE=$base"

$r = Invoke-WebRequest -Uri "$base/health" -UseBasicParsing
if ($r.StatusCode -ne 200) { throw "/health expected 200 got $($r.StatusCode)" }
if ($r.Content -notmatch '"ok"') { throw "/health body missing ok" }

$r2 = Invoke-WebRequest -Uri "$base/api/status" -UseBasicParsing
if ($r2.StatusCode -ne 200) { throw "/api/status expected 200 got $($r2.StatusCode)" }

Write-Host "OK: smoke tests passed for $base"
