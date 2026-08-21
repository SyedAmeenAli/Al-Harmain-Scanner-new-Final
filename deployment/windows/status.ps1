# Al Haramain — status check (Phase K).
# Curls /api/health on the local backend and reports pass/fail.

param(
    [string]$BaseUrl = "http://localhost:8000"
)

$ScriptDir = $PSScriptRoot
$PidFile   = Join-Path $ScriptDir "backend.pid"

if (Test-Path $PidFile) {
    $procId = Get-Content $PidFile | Select-Object -First 1
    $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($p) {
        Write-Host "Process: RUNNING (PID $procId)"
    } else {
        Write-Host "Process: PID file present but process not running (stale)"
    }
} else {
    Write-Host "Process: no PID file (not started via start-production.ps1, or already stopped)"
}

try {
    $resp = Invoke-RestMethod -Uri "$BaseUrl/api/health" -TimeoutSec 5
    Write-Host "Health:  OK"
    Write-Host ("  status={0} products={1} database={2} admin_configured={3} version={4}" -f `
        $resp.status, $resp.products, $resp.database, $resp.admin_configured, $resp.version)
} catch {
    Write-Host "Health:  FAIL — $($_.Exception.Message)"
    exit 1
}
