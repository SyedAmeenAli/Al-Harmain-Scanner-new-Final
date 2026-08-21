# Al Haramain — production stop script (Phase K).
# Kills the process tracked by backend.pid (written by start-production.ps1).
# Falls back to matching a uvicorn/server:app process if the PID file is
# stale, so a machine restart doesn't leave an orphan you can't stop.

$ScriptDir = $PSScriptRoot
$PidFile   = Join-Path $ScriptDir "backend.pid"

$stopped = $false

if (Test-Path $PidFile) {
    $procId = Get-Content $PidFile | Select-Object -First 1
    if ($procId) {
        $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($p) {
            Write-Host "Stopping PID $procId ..."
            Stop-Process -Id $procId -Force
            $stopped = $true
        }
    }
    Remove-Item $PidFile -ErrorAction SilentlyContinue
}

if (-not $stopped) {
    Write-Host "PID file missing/stale — searching for a running uvicorn server:app process..."
    $candidates = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" |
        Where-Object { $_.CommandLine -match "uvicorn" -and $_.CommandLine -match "server:app" }
    foreach ($c in $candidates) {
        Write-Host "Stopping PID $($c.ProcessId): $($c.CommandLine)"
        Stop-Process -Id $c.ProcessId -Force
        $stopped = $true
    }
}

if ($stopped) {
    Write-Host "Backend stopped."
} else {
    Write-Host "No running backend process found (already stopped)."
}
