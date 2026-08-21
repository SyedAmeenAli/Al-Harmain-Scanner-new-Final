# Store Installation Checklist

Print this. Check off each item on the actual store machine/network. See
`deployment\README.md` for the detailed steps behind each line.

## Machine
- [ ] Dedicated machine (not a shared staff PC), Windows 10/11
- [ ] Python 3.11+ installed, on PATH
- [ ] Node.js installed (build-time only)
- [ ] Repo present, `pip install -r backend\requirements.txt` run
- [ ] `frontend\npm install && npm run build` run — `frontend\build\index.html` exists

## Data
- [ ] `backend\data\alharamain.sqlite` present
- [ ] `GET /api/health` shows `products` matching the expected catalogue count
- [ ] Product images spot-checked (a handful of `/assets/products/<slug>/thumb.webp` load)

## Admin
- [ ] `backend\.env` created from `.env.example`, real values filled in
- [ ] Admin PIN set via `python backend\scripts\set_admin_pin.py`
- [ ] `/admin/catalogue` login works with the real PIN
- [ ] Unauthenticated admin write requests are rejected (401/403) — spot check

## Autostart
- [ ] `install-autostart.ps1` run ON THIS MACHINE by an admin (not copy-pasted from a dev machine)
- [ ] Machine rebooted once to confirm the Scheduled Task actually starts the server
- [ ] `status.ps1` passes after that reboot with no manual intervention

## Network — guest WiFi reachability
- [ ] Store machine has a DHCP reservation / static IP
- [ ] A guest-WiFi phone can reach `http://<STORE-IP>:8000/api/health` (200)
- [ ] AP client isolation confirmed OFF toward the catalogue server specifically

## Network — isolation (the other direction)
- [ ] A guest-WiFi phone CANNOT reach POS terminals
- [ ] A guest-WiFi phone CANNOT reach the NAS / file shares
- [ ] A guest-WiFi phone CANNOT reach printers
- [ ] A guest-WiFi phone CANNOT reach the router's admin page

## Firewall / exposure
- [ ] Windows Firewall rule scoped to the guest-WiFi CIDR only (not "Any")
- [ ] No port forwarding / DMZ / UPnP rule anywhere pointing at this app
- [ ] Confirmed: app is unreachable from outside the store's own network (test on cellular data, should fail)

## QR code
- [ ] `generate_store_qr.py --url http://<STORE-IP>:8000/` run with the REAL address
- [ ] Printed QR scanned and tested on a real iPhone
- [ ] Printed QR scanned and tested on a real Android phone

## Customer experience — all load correctly on a real phone
- [ ] Hero
- [ ] Collection (Infinite Shelf)
- [ ] Scent Orbit
- [ ] Most Loved
- [ ] Search
- [ ] Fragrance Detail page
- [ ] Menu / navigation

## Resilience
- [ ] Internet-disconnected test: unplug/disable the store's WAN link, confirm the catalogue still fully works on the guest LAN (per the Internet Dependency Audit — no required remote calls on the customer flow)
- [ ] Restart test: stop the service, start it again, confirm health + product count + admin-config state all unchanged
- [ ] A real backup exists and was verified to contain the current product count (`python backend\scripts\backup_catalogue.py`, then open the output file and count rows)
