---
id: t-0ccxkr
title: "C8 — Cover letters + résumés, read and copy only"
status: done
owner: sayantan-23
milestone: m-0cc02t
created: 2026-08-29T07:15:35Z
updated: 2026-09-06T17:39:00Z
estimate: M
blocked_by: [t-0ccxkl, t-0ccxkm]
decisions: [d-003]
tags: [mobile, expo, documents]
---

Spec §4.7. **Ships as the Vault tab** ([[d-0cd3wr]]).
**Scope updated per user request (2026-09-06):**
- **Cover Letters:** Full parity with web app — read markdown, manual edit, new creation (from tracked job or pasted description with persona & instructions), AI refine actions (`humanize`, `shorten`, `lengthen`, `fix-grammar`, `custom`), proposal review with word diff, plain text copy, and PDF share.
- **Résumés:** View structured CV, plain-text copy, and on-device PDF export/share. Editing and generation are deferred with 'Coming soon' affordances.

**Done when**
- Vault tab displays both Résumé and Cover Letter libraries.
- Cover letters can be viewed, created via AI, edited, refined with proposals, copied, and shared as PDF.
- Résumés can be viewed, copied, and shared as PDF.
- Local PDF generation uses `expo-print` and `expo-sharing`.

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
