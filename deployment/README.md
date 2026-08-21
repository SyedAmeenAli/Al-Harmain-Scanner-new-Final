# Al Haramain — In-Store Catalogue: Production Runbook

Private, mobile-first, QR-driven in-store catalogue. **Not an ecommerce
site** — no cart, checkout, payments, shipping, or customer accounts. Written
for a technician who did not build this app.

Every step below is tagged:
- **[REPO]** — already done in this repository, verify only.
- **[DO]** — an action the technician must perform on the store machine.
- **[NETWORK-ADMIN]** — requires the store's network administrator.

---

## 1. Prerequisites

- **[DO]** Windows 10/11 machine, dedicated to this app (not a shared staff PC).
- **[DO]** Python 3.11+ on PATH (`python --version`).
- **[DO]** Node.js 18+ (only needed once, to build the frontend — not needed
  at runtime after the build exists).
- **[DO]** Git (to pull the repo / updates).

## 2. Install dependencies

```powershell
cd backend
python -m venv .venv          # optional but recommended
.venv\Scripts\activate
pip install -r requirements.txt

cd ..\frontend
npm install
```

## 3. Build the frontend

```powershell
cd frontend
npm run build
```
Verify `frontend\build\index.html` exists before continuing.

## 4. Configure environment

**[DO]**
```powershell
copy backend\.env.example backend\.env
notepad backend\.env
```
Set at minimum: `PORT`, `PUBLIC_ORIGIN` (the real store URL, e.g.
`http://192.168.50.20:8000`), `CORS_ORIGINS` (same value), `COOKIE_SECURE`
(leave `false` unless you have real HTTPS — see §15). See
`backend\.env.example` for every variable and what it does.

## 5. Configure the admin PIN

**[DO]** — the repo intentionally ships with **no PIN configured**
(`admin_credentials` table empty, `/api/admin/auth/login` returns
`503 admin_not_configured`). Set a real PIN on the store machine:
```powershell
cd backend
python scripts\set_admin_pin.py
```
Follow its prompts. Do this only on the real store machine, never commit a
PIN anywhere.

## 6. Start / stop / restart / status

```powershell
powershell -ExecutionPolicy Bypass -File deployment\windows\start-production.ps1
powershell -ExecutionPolicy Bypass -File deployment\windows\status.ps1
powershell -ExecutionPolicy Bypass -File deployment\windows\restart-production.ps1
powershell -ExecutionPolicy Bypass -File deployment\windows\stop-production.ps1
```
`start-production.ps1` refuses to start (with a clear message) if the build
or DB is missing, loads `backend\.env`, and starts
`uvicorn server:app --host <HOST> --port <PORT>` **without** `--reload`. Logs
go to `deployment\windows\logs\`.

## 7. Automatic startup on boot

**[DO, ON THE STORE MACHINE ONLY]** — `deployment\windows\install-autostart.ps1`
registers a Scheduled Task that runs `start-production.ps1` at boot. This
repository's automated build/test process never ran it — it was only
written and reviewed. Run it yourself, elevated, on the real machine:
```powershell
powershell -ExecutionPolicy Bypass -File deployment\windows\install-autostart.ps1
```
Optional alternative for teams who prefer it: [NSSM](https://nssm.cc/) can
wrap `start-production.ps1` as a proper Windows Service instead of a
Scheduled Task. Not required — the Scheduled Task approach needs no extra
software.

## 8. Stable local IP

**[NETWORK-ADMIN]** Give the store machine a **DHCP reservation** (or static
IP) on the router so its LAN address never changes — the QR code encodes
this address. See `deployment\network\README.md`.

## 9. Local DNS (optional, cosmetic)

**[NETWORK-ADMIN]** If the router supports local DNS/hosts entries, point a
friendly name (e.g. `catalogue.store.local`) at the reservation from §8.
Not required — an IP works fine, this only makes it typable.

## 10. Guest WiFi rules & firewall

**[NETWORK-ADMIN]** See `deployment\network\README.md` in full. Summary:
guest WiFi devices must reach the catalogue server's IP:port, and must NOT
reach POS/staff PCs/NAS/printers/router admin. AP client-isolation is the
most common blocker — test it explicitly.

**[DO]** Windows Firewall — review and manually run
`deployment\windows\firewall-rule-template.ps1 -RemoteCIDR <guest-subnet> -Port 8000`
after confirming the CIDR with the network admin. Never widen it to "Any".
**No port forwarding, no WAN/NAT exposure — ever.**

## 11. Generate the QR code

**[DO]**, once the real store URL is known:
```powershell
cd backend
python scripts\generate_store_qr.py --url http://<STORE-IP>:8000/
```
Output: `deployment\qr\store-qr.png` (+ `.svg`). Print it, test-scan with
both an iPhone and an Android phone on the guest WiFi before going live.

## 12. Phone test

**[DO]** On a real phone, on guest WiFi (not the store machine's own
network): scan the QR, load the site, browse Hero → Collection → Orbit →
Search → Detail, open `/admin/catalogue` and confirm PIN login works after
§5. See `deployment\checklists\manual-mobile-visual-qa.md` for the full
visual QA pass.

## 13. Backup

**[DO]**
```powershell
python backend\scripts\backup_catalogue.py           # DB only, keeps last 14 (BACKUP_RETENTION)
powershell -File deployment\windows\backup-full.ps1   # DB + product images + non-secret config
```
Backups use SQLite's online backup API (safe against a live WAL writer), not
a raw file copy. Schedule `backup-full.ps1` via Task Scheduler (daily,
outside business hours) if the store wants automated backups — this repo
does not install that schedule automatically (same "write scripts, don't
auto-install" policy as §7).

## 14. Restore

**Manual, operator-driven — never automatic.**
1. `powershell -File deployment\windows\stop-production.ps1`
2. Move the current (broken) `backend\data\alharamain.sqlite*` files and
   `frontend\public\assets\products\` aside (rename, don't delete) so you can
   roll back your rollback if needed.
3. Pick a backup folder under `backend\backups\` (or the full-backup
   destination).
4. Copy the chosen `alharamain-<timestamp>.sqlite` to
   `backend\data\alharamain.sqlite` (and, for a full restore, copy the
   `product-images\products\` folder back to
   `frontend\public\assets\products\`).
5. `powershell -File deployment\windows\start-production.ps1`
6. `powershell -File deployment\windows\status.ps1` — confirm
   `products` count matches expectations.
7. Phone test (§12) before telling staff it's back.

## 15. HTTPS decision

**Recommendation: plain HTTP on the isolated guest-WiFi LAN.** A self-signed
certificate causes a scary "Your connection is not private" full-screen
warning on every customer's phone on first visit — bad for a walk-up retail
experience, and confusing for non-technical staff to explain. Plain HTTP on
a network that is (per §10) isolated from the internet and from POS/staff
systems is the pragmatic default for this specific use case: a private,
read-mostly, non-payment catalogue. `COOKIE_SECURE=false` supports this as a
first-class mode (see `backend\.env.example`), not a workaround.

**Future upgrade path**, if the store later gets a real domain + certificate
(e.g. via a reverse proxy with Let's Encrypt, or an internal CA the store
already trusts on managed devices): set `COOKIE_SECURE=true`, terminate TLS
in front of uvicorn, and update `PUBLIC_ORIGIN`/`CORS_ORIGINS` to `https://`.
No app code changes are required beyond that env flip.

## 16. Update procedure

1. `git pull` (or copy the new files onto the machine).
2. `cd backend && pip install -r requirements.txt` (only if requirements changed).
3. `cd frontend && npm install && npm run build` (only if frontend changed).
4. `powershell -File deployment\windows\backup-full.ps1` (safety net before restarting).
5. `powershell -File deployment\windows\restart-production.ps1`.
6. `powershell -File deployment\windows\status.ps1` — confirm health OK and
   product count unchanged (unless the update intentionally changed the
   catalogue).
7. Phone test.

## 17. Rollback procedure

1. `powershell -File deployment\windows\stop-production.ps1`.
2. `git checkout <previous-known-good-tag-or-commit>` (or restore the
   previous file copy).
3. If the DB schema changed in the bad update, restore the pre-update backup
   per §14 instead of just reverting code.
4. `cd frontend && npm run build` if frontend files changed.
5. `powershell -File deployment\windows\start-production.ps1`.
6. `powershell -File deployment\windows\status.ps1` + phone test.

## 18. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| Phone can't load the site at all | AP client isolation, wrong IP, firewall | `deployment\network\README.md`, §10 |
| `start-production.ps1` refuses to start | Missing `frontend\build` or DB | Run `npm run build`; confirm `backend\data\alharamain.sqlite` exists |
| Admin login returns `admin_not_configured` | PIN never set (expected out of the box) | §5 |
| Site loads but shows 0 products / "Catalogue temporarily unavailable" | Backend down, or DB path wrong | `status.ps1`, check `deployment\windows\logs\` |
| `/admin/catalogue` 404s instead of loading | Build stale / SPA fallback not mounted | Re-run `npm run build`; confirm `frontend\build\index.html` exists, restart |
| A replaced product image still shows the old photo on a phone | Browser image cache (stable filename) | Hard-refresh; see §"Cache Policy" in the Phase K report |
