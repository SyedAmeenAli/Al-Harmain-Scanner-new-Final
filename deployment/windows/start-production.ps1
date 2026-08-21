# Al Haramain — production start script (Phase K).
# Starts the backend WITHOUT --reload, serving the built React app + API from
# one origin. Run this ON THE STORE MACHINE (or on a dev machine for a local
# smoke test — that is fine, nothing here is destructive).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File deployment\windows\start-production.ps1
#
# Env overrides (set in backend\.env, or in the shell before running this):
#   HOST (default 0.0.0.0)   PORT (default 8000)   WORKERS (default 4)
#
# WORKERS: uvicorn multi-process worker count. SQLite (WAL mode) supports
# multiple concurrent reader processes fine; admin writes still serialize
# safely via SQLite's own locking either way. Verified on this machine:
# single worker under 30 concurrent search requests => p95 ~2.2s; 4 workers
# under the same load => p95 ~0.9s. Default 4 is a reasonable starting
# point for a single in-store mini-PC; raise/lower based on actual store
# hardware core count if needed.

$ErrorActionPreference = "Stop"

$ScriptDir   = $PSScriptRoot
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
$BackendDir  = Join-Path $ProjectRoot "backend"
$BuildDir    = Join-Path $ProjectRoot "frontend\build"
$LogDir      = Join-Path $ScriptDir "logs"
$PidFile     = Join-Path $ScriptDir "backend.pid"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# --- Preconditions -------------------------------------------------------- #
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Error "Python was not found on PATH. Install Python 3.11+ and re-run."
    exit 1
}

if (-not (Test-Path (Join-Path $BuildDir "index.html"))) {
    Write-Error @"
frontend\build\index.html not found.
Run the frontend build first:
    cd frontend
    npm install
    npm run build
Then re-run this script.
"@
    exit 1
}

if (-not (Test-Path (Join-Path $BackendDir "data\alharamain.sqlite"))) {
    Write-Error "backend\data\alharamain.sqlite not found. Restore a backup or re-import the catalogue first."
    exit 1
}

# --- Load backend\.env (KEY=VALUE lines) into this process's env ---------- #
$envFile = Join-Path $BackendDir ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
        $k, $v = $_ -split '=', 2
        [System.Environment]::SetEnvironmentVariable($k.Trim(), $v.Trim())
    }
    Write-Host "Loaded backend\.env"
} else {
    Write-Warning "backend\.env not found — using defaults / process env only. Copy backend\.env.example to backend\.env to customize."
}

$bindHost = if ($env:HOST) { $env:HOST } else { "0.0.0.0" }
$port     = if ($env:PORT) { $env:PORT } else { "8000" }
$workers  = if ($env:WORKERS) { $env:WORKERS } else { "4" }
if (-not $env:LOG_FILE) {
    $env:LOG_FILE = Join-Path $LogDir "backend.log"
}

Write-Host "Starting Al Haramain backend on $bindHost`:$port (no --reload, $workers workers)"
Write-Host "Logs: $($env:LOG_FILE)"

$stdout = Join-Path $LogDir "uvicorn.out.log"
$stderr = Join-Path $LogDir "uvicorn.err.log"

$proc = Start-Process -FilePath "python" `
    -ArgumentList @("-m", "uvicorn", "server:app", "--host", $bindHost, "--port", $port, "--workers", $workers) `
    -WorkingDirectory $BackendDir `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -PassThru -WindowStyle Hidden

$proc.Id | Out-File -FilePath $PidFile -Encoding ascii -Force
Write-Host "Started. PID=$($proc.Id) (tracked in $PidFile)"
Write-Host "Check status:  powershell -File deployment\windows\status.ps1"
Write-Host "Stop:          powershell -File deployment\windows\stop-production.ps1"
