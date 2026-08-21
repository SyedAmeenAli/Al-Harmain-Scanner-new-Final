# Al Haramain — restart script (Phase K). stop, wait briefly, start.
$ScriptDir = $PSScriptRoot

& (Join-Path $ScriptDir "stop-production.ps1")
Start-Sleep -Seconds 2
& (Join-Path $ScriptDir "start-production.ps1")
