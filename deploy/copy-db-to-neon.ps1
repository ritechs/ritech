<#
  Copies your local RiTECHS database (tables + data) into the Neon database.
  Run from the project folder in PowerShell:

    powershell -ExecutionPolicy Bypass -File deploy\copy-db-to-neon.ps1

  Reads DATABASE_URL (your PC) and NEON_DATABASE_URL (Neon) from .env.
  The Neon database must be EMPTY (a new project). The dump holds real user data,
  so it is written to your Temp folder and deleted afterwards; it never enters git.
#>
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) { throw ".env not found in $root" }

$vars = @{}
foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') { $vars[$Matches[1]] = $Matches[2].Trim('"') }
}
$local = $vars["DATABASE_URL"]
$neon = $vars["NEON_DATABASE_URL"]
if (-not $local) { throw "DATABASE_URL (your local database) is empty in .env" }
if (-not $neon -or $neon -notmatch "neon\.tech") { throw "Paste your Neon connection string (...neon.tech...) into NEON_DATABASE_URL in .env" }
if ($neon -match "-pooler\.") { throw "Use Neon's direct connection string (turn OFF 'Connection pooling' in Neon's Connect dialog)." }

# Find pg_dump / pg_restore: PATH first, then the newest PostgreSQL install.
$bin = $null
if (Get-Command pg_dump -ErrorAction SilentlyContinue) { $bin = Split-Path (Get-Command pg_dump).Source }
else {
  $dir = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue | Sort-Object { [int]($_.Name -replace '\D', '') } -Descending | Select-Object -First 1
  if ($dir) { $bin = Join-Path $dir.FullName "bin" }
}
if (-not $bin -or -not (Test-Path (Join-Path $bin "pg_dump.exe"))) { throw "pg_dump not found. Install PostgreSQL client tools or add its bin folder to PATH." }
$pgDump = Join-Path $bin "pg_dump.exe"
$pgRestore = Join-Path $bin "pg_restore.exe"
$psql = Join-Path $bin "psql.exe"

# Refuse to overwrite a Neon database that already has tables.
$count = & $psql $neon -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
if ($LASTEXITCODE -ne 0) { throw "Could not connect to Neon. Check NEON_DATABASE_URL." }
if ([int]$count -gt 0) { throw "The Neon database already has $count tables. Use a new, empty Neon database (or delete and recreate it in the Neon console)." }

$dump = Join-Path $env:TEMP ("ritechs-" + [guid]::NewGuid().ToString("N") + ".dump")
try {
  Write-Host "1/3 Exporting your local database..."
  & $pgDump --format=custom --no-owner --no-privileges --dbname=$local --file=$dump
  if ($LASTEXITCODE -ne 0) { throw "pg_dump failed." }

  Write-Host "2/3 Importing into Neon (this can take a few minutes)..."
  & $pgRestore --no-owner --no-privileges --exit-on-error --single-transaction --dbname=$neon $dump
  if ($LASTEXITCODE -ne 0) { throw "pg_restore failed. Nothing was imported (single transaction); fix the error and run again." }

  Write-Host "3/3 Checking..."
  & $psql $neon -c "SELECT (SELECT count(*) FROM ""user"") AS users, (SELECT count(*) FROM member_profiles) AS members, (SELECT count(*) FROM news_posts) AS news, (SELECT count(*) FROM conferences) AS conferences"
  Write-Host "Done. Your data is in Neon."
}
finally {
  if (Test-Path $dump) { Remove-Item $dump -Force }
}
