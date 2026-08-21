# Al Haramain — full backup (Phase K).
# DB backup goes through backend/scripts/backup_catalogue.py (SQLite online
# backup API — safe against a live WAL writer), NOT a raw file copy. Also
# copies admin-uploaded product images and non-secret config into one
# timestamped folder.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File deployment\windows\backup-full.ps1
#   powershell -ExecutionPolicy Bypass -File deployment\windows\backup-full.ps1 -Destination "D:\AlHaramainBackups"

param(
    [string]$Destination = (Join-Path $PSScriptRoot "..\..\backend\backups\full")
)

$ErrorActionPreference = "Stop"

$ScriptDir   = $PSScriptRoot
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
$BackendDir  = Join-Path $ProjectRoot "backend"
$ProductsDir = Join-Path $ProjectRoot "frontend\public\assets\products"

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$Destination = [System.IO.Path]::GetFullPath($Destination)
$OutDir = Join-Path $Destination $ts
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Write-Host "Backing up to $OutDir"

# 1. Database — via the Python online-backup script, not a raw file copy.
$dbOutDir = Join-Path $OutDir "database"
python (Join-Path $BackendDir "scripts\backup_catalogue.py") --dest $dbOutDir --retain 999999
if ($LASTEXITCODE -ne 0) {
    Write-Error "Database backup failed (see output above)."
    exit 1
}

# 2. Admin-uploaded product images.
if (Test-Path $ProductsDir) {
    $imgOutDir = Join-Path $OutDir "product-images"
    Write-Host "Copying product images from $ProductsDir ..."
    Copy-Item -Path $ProductsDir -Destination $imgOutDir -Recurse -Force
} else {
    Write-Warning "Product images directory not found: $ProductsDir"
}

# 3. Non-secret config — .env.example only (never the real .env, which may
#    hold JWT_SECRET / real values). Document that the real .env must be
#    backed up separately and stored securely if the operator wants it.
$configOutDir = Join-Path $OutDir "config"
New-Item -ItemType Directory -Force -Path $configOutDir | Out-Null
Copy-Item -Path (Join-Path $BackendDir ".env.example") -Destination $configOutDir -Force -ErrorAction SilentlyContinue

Write-Host "Full backup complete: $OutDir"
Write-Host "NOTE: backend\.env (real secrets) was intentionally NOT copied. Back it up separately if needed, to a secure location."
