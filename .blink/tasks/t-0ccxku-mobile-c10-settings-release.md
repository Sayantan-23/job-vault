---
id: t-0ccxku
title: "C10 — Settings, icons, splash, EAS build, store release"
status: planned
milestone: m-0cc02t
created: 2026-08-29T07:15:35Z
updated: 2026-08-29T07:15:35Z
estimate: M
blocked_by: [t-0ccxkp, t-0ccxkq, t-0ccxkr, t-0ccxks, t-0ccxkt]
decisions: [d-0cc2w5]
tags: [mobile, expo, release]
---

Spec §4.10 and §6.

**Settings, trimmed:** theme toggle, account fields, logout, push-notification
preferences (new). API-key management for the Chrome extension stays web-only —
managing a desktop browser's keys from a phone is not a real workflow.

**Release — this task owns the entire EAS setup.** Everything before it runs on
local builds, so EAS is first touched here (deferred from C0, 2026-08-29). The
user runs these; they need a browser login and cannot be handed off:

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest init          # name it: jobvault-mobile
```

Do **not** reuse the `sayantan-expo` project id `b8aecc62-4896-4f2c-86ab-d42d261adcba`
([[d-0cc2w5]]). Then icons, splash, and Android first. **Cloud EAS builds need
explicit user approval** — 10–20 min each against a monthly quota.

iOS has no local build path on Linux, so it is EAS-only with no local iteration —
sequence it after Android is shipping.

Skills: `eas-app-stores`.

---
*Cold-start: read `docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md` §8 first — it is written to be read with no other
context. Repo root is `git rev-parse --show-toplevel` (this repo is worked on
from two machines; never hardcode a home path).*
