---
id: t-0ccxkt
title: "C7 — Search screen"
status: planned
milestone: m-0cc02t
created: 2026-08-29T07:15:35Z
updated: 2026-08-29T07:15:35Z
estimate: S
blocked_by: [t-0ccxkn, t-0ccxko]
decisions: [d-0c5wyy]
tags: [mobile, expo, search]
---

Spec §4.9.

**Done when** a full-screen search behind a header icon hits the same
`GET /api/search` across all five entity types, with the two-band ranking
unchanged, and each result deep-links to its screen.

Web's morphing ⌘K palette does **not** port — there is no ⌘K on a phone and the
morph is Framer-specific. A Reanimated re-implementation is optional polish, not
part of done.

**Backend is ready.** [[t-0cbm48]] (partial/substring search) shipped
2026-08-29, so two characters already find anything containing them — no backend
work is needed for this screen. Its known trade-off, multi-word proximity
ranking, is recorded in [[d-0ccyjm]] with [[t-0cczse]] to undo it; that is
independent of this task and not a blocker.

---
*Cold-start: read `docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md` §8 first — it is written to be read with no other
context. Repo root is `git rev-parse --show-toplevel` (this repo is worked on
from two machines; never hardcode a home path).*
