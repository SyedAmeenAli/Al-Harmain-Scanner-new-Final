<#
Al Haramain — Windows Firewall rule template (Phase K).

*** WRITE-ONLY. DO NOT RUN THIS SCRIPT. ***
This is a parameterized template for the store's network administrator to
review and run themselves, on the actual store machine, after confirming the
correct guest-WiFi subnet with whoever manages that network. It was never
executed in this environment — no real firewall rule has been created.

It allows inbound TCP on the catalogue port, scoped to a specific remote
CIDR (the guest-WiFi subnet) — never "Any" — so only guest-WiFi devices can
reach the backend, not the whole LAN.

Usage (ON THE STORE MACHINE, elevated PowerShell, after confirming the CIDR):
    powershell -ExecutionPolicy Bypass -File deployment\windows\firewall-rule-template.ps1 `
        -RemoteCIDR "192.168.50.0/24" -Port 8000
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$RemoteCIDR,     # e.g. "192.168.50.0/24" — the GUEST WiFi subnet, ask network admin. Never "Any".

    [Parameter(Mandatory = $true)]
    [int]$Port,              # e.g. 8000 — must match backend\.env PORT

    [string]$RuleName = "AlHaramainCatalogue-Inbound"
)

$ErrorActionPreference = "Stop"

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "Run this from an elevated (Administrator) PowerShell prompt."
    exit 1
}

Write-Host "This will create an inbound firewall rule:"
Write-Host "  Name        : $RuleName"
Write-Host "  Direction   : Inbound"
Write-Host "  Protocol    : TCP"
Write-Host "  Local Port  : $Port"
Write-Host "  Remote CIDR : $RemoteCIDR  (scope this to the GUEST WiFi subnet ONLY)"
Write-Host ""
Write-Host "This script does NOT run automatically — review the values above, then"
Write-Host "uncomment the New-NetFirewallRule call below and re-run, or run it"
Write-Host "manually. Never widen RemoteAddress to 'Any' — that would expose the"
Write-Host "catalogue server to the entire network, including POS/staff/NAS."

# New-NetFirewallRule -DisplayName $RuleName -Direction Inbound -Action Allow `
#     -Protocol TCP -LocalPort $Port -RemoteAddress $RemoteCIDR

Write-Host ""
Write-Host "No WAN/port-forwarding rule is included here, and none should ever be"
Write-Host "created for this app — it is a private in-store LAN service only."
