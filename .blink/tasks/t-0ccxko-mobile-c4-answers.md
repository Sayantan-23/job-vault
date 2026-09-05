---
id: t-0ccxko
title: "C4 — Saved answers library"
status: done
owner: coder
milestone: m-0cc02t
created: 2026-08-29T07:15:35Z
updated: 2026-09-05T22:40:00Z
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

**Shipped 2026-09-05:**
- Installed `expo-clipboard` and `expo-haptics` with light haptic confirmation and 2-second transient "Copied" feedback.
- Copy chips stamp `last_used_at` via `POST /api/answers/:id/used` without cache re-order jitter.
- `AnswersScreen` with instant client-side search over questions and answer bodies, empty states, and delete confirm modal.
- `AnswerSheet` create/edit bottom sheet with character counts (aims for 500 short / 2000 long).
- Landed the job-context picker (`t-0c61ek`) inside `GenerateAnswerControls` allowing selection of active jobs alongside personas for AI answer drafting.
- 44/44 mobile test suites (141 tests) passed; `expo export` bundled cleanly; full repo test suite (137 suites, 648 tests) green.

Skills: `expo-ui`, `expo-native-ui`.

---
*Cold-start: read `docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md` §8 first — it is written to be read with no other
context. Repo root is `git rev-parse --show-toplevel` (this repo is worked on
from two machines; never hardcode a home path).*
