# Manual Mobile Visual QA Checklist

**This requires a physical phone.** Automated tooling in this environment
(the browser pane used during development) could not composite frames for
pixel-level visual verification in any of the prior verification passes on
this project — this checklist exists specifically to close that gap with a
real device. Do not consider Phase K's UI claims "verified" until a human
has walked this list on an actual iPhone and an actual Android phone.

Use guest WiFi, not the store machine's own network, so you're testing the
real customer path end to end (§10/§11 of `deployment\README.md`).

## Setup
- [ ] Scan the printed QR with the phone's native camera app (not a QR app) — does it prompt to open the link?
- [ ] Page loads within a few seconds on a typical phone data/WiFi connection

## Hero
- [ ] Hero video plays (or poster image shows cleanly if video is still buffering)
- [ ] No layout shift/jump as the video loads
- [ ] Logo/brand mark renders at the right size, not stretched or blurry
- [ ] Entrance animation completes and doesn't get "stuck" on a slow connection

## Collection (Infinite Shelf)
- [ ] Horizontal drag/swipe feels natural with a thumb (not a mouse)
- [ ] Bottle images are sharp, not pixelated
- [ ] Category filter chips are tappable (not too small for a thumb)
- [ ] Scrolling doesn't accidentally trigger the phone's browser pull-to-refresh

## Scent Orbit
- [ ] Notes are legible at phone text size
- [ ] Tapping a note opens the Fragrance Finder with that note pre-filled

## Most Loved
- [ ] Section loads with real products (not placeholders)
- [ ] Tapping a product opens its detail view

## Search
- [ ] Keyboard doesn't cover the input field or results
- [ ] Typing shows results without excessive lag
- [ ] Tapping a result opens the right product

## Fragrance Detail
- [ ] Large product image loads and is legible
- [ ] Notes (top/heart/base) are all present and correctly attributed
- [ ] Sizes/prices display correctly
- [ ] Related products section shows relevant items, not empty

## Menu / Navigation
- [ ] Menu opens/closes cleanly with a tap (no accidental double-triggers)
- [ ] Every nav link goes to a real, populated screen — nothing dead-ends

## Cross-cutting
- [ ] Rotate the phone — layout doesn't break in landscape
- [ ] Turn on a screen reader briefly (VoiceOver/TalkBack) — is anything completely unlabeled/unusable?
- [ ] Airplane-mode-then-reconnect: does the app recover gracefully, or does it need a manual refresh?
- [ ] Battery/thermal: no runaway CPU usage that heats the phone or drains battery unusually fast during a few minutes of normal browsing

## Sign-off
Tester name: _______________  Device(s): _______________  Date: _______________
Pass / Fail (circle one). If Fail, list the failing items above and re-test after fixes.
