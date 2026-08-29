---
id: t-0ccxko
title: "C4 — Saved answers library"
status: planned
milestone: m-0cc02t
created: 2026-08-29T07:15:35Z
updated: 2026-08-29T07:15:35Z
estimate: M
blocked_by: [t-0ccxkl, t-0ccxkm]
tags: [mobile, expo, answers]
---

Spec §4.6. Its **own top-level tab** ([[d-0cd3wr]]) — deliberately not filed
inside Vault, because it is a tool used while standing in a form, not an archive
you read. **Highest value-per-line in the milestone** — small surface, and the
copy-chip loop is genuinely better on a phone than on a laptop, because the
form is on the phone. Runs parallel with C3.

**Done when**
- List, detail sheet, dual-variant display, and copy chips that stamp
  `last_used_at` — all of it, unlike the read-only tiers.
- Generation reuses `POST /api/answers/generate` unchanged.
- **Land the job-context picker** ([[t-0c61ek]]) here: `jobId` is already wired
  end-to-end but no UI sends it. This is the natural place to finally send it.
- Clipboard via `expo-clipboard`, with haptic confirmation.

Skills: `expo-ui`, `expo-native-ui`.

---
*Cold-start: read `docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md` §8 first — it is written to be read with no other
context. Repo root is `git rev-parse --show-toplevel` (this repo is worked on
from two machines; never hardcode a home path).*
