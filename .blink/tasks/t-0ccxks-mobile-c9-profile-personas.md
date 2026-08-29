---
id: t-0ccxks
title: "C9 — Profile + personas, read-only"
status: planned
milestone: m-0cc02t
created: 2026-08-29T07:15:35Z
updated: 2026-08-29T07:15:35Z
estimate: S
blocked_by: [t-0ccxkl, t-0ccxkm]
tags: [mobile, expo, profile]
---

Spec §4.8. Runs parallel with C3. **Reached from the header avatar, not a tab**
([[d-0cd3wr]]) — profile, personas and settings all sit behind it, mirroring web's
`AccountMenu`.

**Done when** there is a read-only profile summary and a persona list, and
editing links out to the web app.

**Deliberately not built:** the six editor sections with their bullet-list
editors, chip inputs and month-year pickers; persona editing; PDF résumé import.
Web's profile editor is 881 lines and personas 959 — rebuilding them for a
390px screen is the single most expensive way to add the least value.

No webview fallback: DOM components were rejected outright (spec §3.3), so a T3
surface links out or is built natively — never wrapped.

---
*Cold-start: read `docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md` §8 first — it is written to be read with no other
context. Repo root is `git rev-parse --show-toplevel` (this repo is worked on
from two machines; never hardcode a home path).*
