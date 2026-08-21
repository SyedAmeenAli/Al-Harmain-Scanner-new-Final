<#
Al Haramain — autostart installer (Phase K).

*** DO NOT RUN THIS ON A DEV MACHINE. ***
This must be run ON THE PHYSICAL STORE MACHINE, by an operator with admin
rights, AFTER start-production.ps1 has been verified to work manually at
least once. It was written and syntax-checked as part of Phase K but was
NEVER EXECUTED against this development machine — running it here would
install a real startup task on the wrong computer.

What it does: registers a Scheduled Task that runs start-production.ps1 at
system boot (At Startup trigger), running as SYSTEM (or a specified user),
with "restart on failure" retry settings, and the working directory set to
the project root so relative paths resolve correctly.

Usage (ON THE STORE MACHINE, elevated PowerShell):
    powershell -ExecutionPolicy Bypass -File deployment\windows\install-autostart.ps1

To remove it later:
    Unregister-ScheduledTask -TaskName "AlHaramainCatalogue" -Confirm:$false
#>

param(
    [string]$TaskName = "AlHaramainCatalogue"
)

$ErrorActionPreference = "Stop"

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "Run this from an elevated (Administrator) PowerShell prompt."
    exit 1
}

$ScriptDir   = $PSScriptRoot
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
$StartScript = Join-Path $ScriptDir "start-production.ps1"

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$StartScript`"" `
    -WorkingDirectory $ProjectRoot

$trigger = New-ScheduledTaskTrigger -AtStartup

$settings = New-ScheduledTaskSettingsSet `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable `
    -DontStopOnIdleEnd

# Runs as SYSTEM so it starts before any user logs in. Change -User/-Password
# (interactive) if the store wants it to run as a specific local account
# instead — SYSTEM is simplest for a dedicated always-on kiosk machine.
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Settings $settings -Principal $principal -Description "Al Haramain in-store catalogue backend — starts at boot" `
    -Force

Write-Host "Scheduled task '$TaskName' registered. It will start the catalogue server on next boot."
Write-Host "Test it now (optional): Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "Remove it later:        Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
