---
id: t-0ccxkp
title: "C5 — Capture: share-sheet target, URL scrape, manual form"
status: planned
milestone: m-0cc02t
created: 2026-08-29T07:15:35Z
updated: 2026-08-29T07:15:35Z
estimate: M
blocked_by: [t-0ccxkn]
tags: [mobile, expo, capture]
---

Spec §4.4. **The reason the app exists.** Share a URL from any app → JobVault
opens with it prefilled and the scrape already running against the existing
`POST /api/jobs/scrape`. **Zero new backend work.**

**Done when**
- `expo-share-intent` registered as an Android/iOS share target for URLs and text.
- Add-job entered from a **floating action button on the right, raised clear
  above the tab bar** ([[d-0cd3wr]] — it does not break or notch the bar's edge),
  morphing into the add-job surface via the same container transform as the web
  search palette ([[d-0cbc74]]). Hides on scroll-down, returns on scroll-up.
- Both paths work: URL paste/scrape and the manual form.

**⚠️ Needs a development build — Expo Go cannot run this.** `expo-share-intent`
ships native code. Use local `npx expo run:android` (free, unlimited, ~2–5 min
on this machine); a cloud EAS build needs explicit approval. Plan for the dev
build to exist by the time this starts, not at C10.

[[t-0010]] (async scrape + push) becomes materially more valuable here — a slow
scrape on mobile must not hold the UI. Not a blocker; worth landing after.

Skills: `expo-animation` (the FAB morph), `expo-dev-client`.

---
*Cold-start: read `docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md` §8 first — it is written to be read with no other
context. Repo root is `git rev-parse --show-toplevel` (this repo is worked on
from two machines; never hardcode a home path).*
