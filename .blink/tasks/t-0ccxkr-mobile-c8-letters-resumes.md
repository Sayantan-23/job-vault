---
id: t-0ccxkr
title: "C8 — Cover letters + résumés, read and copy only"
status: planned
milestone: m-0cc02t
created: 2026-08-29T07:15:35Z
updated: 2026-08-29T07:15:35Z
estimate: M
blocked_by: [t-0ccxkl, t-0ccxkm]
decisions: [d-003]
tags: [mobile, expo, documents]
---

Spec §4.7. Runs parallel with C3. **Ships as the Vault tab** ([[d-0cd3wr]]) —
the two libraries share one tab because both are read-only archives.

**Done when** the user can browse both libraries, read the rendered markdown,
copy to clipboard, and share the PDF through the native share sheet.

**Explicitly not built:** generation bars, the stage-then-commit AI refine flow
and its diff view, and the content editors. Rebuilding the refine UI at 390px is
weeks of work for an interaction nobody wants on a phone.

**PDF.** `@react-pdf/renderer` is web/Node only. Use `expo-print`
(HTML → PDF, on-device) fed by the **shared** `resume-markup.ts` /
`cover-letter-markdown.ts` parsers, so the phone output matches the web preview.
This keeps [[d-003]] intact — rendering happens on-device, nothing is stored
server-side.

`react-markdown` → `react-native-markdown-display`.

---
*Cold-start: read `docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md` §8 first — it is written to be read with no other
context. Repo root is `git rev-parse --show-toplevel` (this repo is worked on
from two machines; never hardcode a home path).*
