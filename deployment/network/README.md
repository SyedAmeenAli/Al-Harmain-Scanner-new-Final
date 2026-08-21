# Network / Guest-WiFi Requirements

This app is a **private in-store catalogue**, not a public website. It must be
reachable only by devices on the store's own network (staff tablet, customer
phones on guest WiFi) and must never be exposed to the internet (no port
forwarding, no WAN/NAT rule — ever).

## Required topology

```
Internet
   |
 Router/Modem  (no port forwarding to this app, ever)
   |
   +-- Staff/POS VLAN ----- POS terminals, NAS, printers, router admin UI
   |                        (the catalogue server should NOT be reachable
   |                         from here unless intentionally on the same VLAN)
   |
   +-- Guest WiFi VLAN ---- Customer phones, the catalogue server (this app)
                            Guest devices must reach the catalogue server,
                            but must NOT reach POS/staff PCs/NAS/printers/
                            router admin — that isolation is the network
                            admin's job, not this app's.
```

## What the store's network admin must configure
This is **REQUIRES STORE NETWORK ADMIN ACTION** — nothing in this repo can do
it for you:

1. Put the catalogue server machine on the same VLAN/subnet as guest WiFi (or
   a subnet guest WiFi is explicitly allowed to reach), and give it a
   **static IP or a DHCP reservation** so the QR code doesn't break after a
   router reboot.
2. Confirm **AP/client isolation is OFF** for that VLAN toward the catalogue
   server's IP specifically (client isolation is a very common default on
   guest WiFi and is the #1 reason phones can't reach an in-store server —
   test this explicitly, don't assume).
3. Confirm guest WiFi devices CANNOT reach POS terminals, the NAS, printers,
   or the router's admin page. If client isolation is fully on (blocking
   guest-to-guest and guest-to-LAN), the admin may need a scoped exception
   just for the catalogue server's IP:port, not a blanket isolation-off.
4. No port forwarding / DMZ / UPnP rule pointing at this app, on this or any
   other router. This app has no authentication hardening for public internet
   exposure and is not designed for it.

## What this repo provides for the app side
- `deployment\windows\firewall-rule-template.ps1` — a **write-only** template
  (never auto-run) for a Windows Firewall inbound rule scoped to the guest
  WiFi CIDR only, on the catalogue port. An operator fills in the real CIDR
  and runs it manually on the store machine.
- `backend\.env.example` → `PUBLIC_ORIGIN` documents the address format
  (`http://<STORE-IP>:8000`) used for the QR code and CORS origin config.

## Recommended IP / DNS approach (see also deployment/README.md)
- Simplest: **DHCP reservation** on the router, bound to the store machine's
  MAC address, so it always gets the same LAN IP. Put that IP in the QR code.
- Optional nicer UX: a **local DNS entry** (e.g. `catalogue.store.local`) via
  the router's local DNS / hosts feature if it has one — cosmetic only, the
  reservation is what actually matters for the QR code to keep working.
