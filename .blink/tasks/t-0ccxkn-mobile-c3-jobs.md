---
id: t-0ccxkn
title: "C3 — Jobs: list, filter sheet, detail screen, status change"
status: done
milestone: m-0cc02t
created: 2026-08-29T07:15:35Z
updated: 2026-09-05T00:00:00Z
estimate: XL
blocked_by: [t-0ccxkl, t-0ccxkm]
tags: [mobile, expo, jobs]
---

Spec §4.1, §4.2, §4.3. The largest surface and the spine of the app.

**Done when**
- **One scrolling list, no Board⇄List toggle.** Grouped by status, infinite
  scroll replacing web's pagination control. `FlatList`/`FlashList`.
- Filters collapse from web's five-control toolbar into a bottom sheet using the
  **same `JobFilters` shape** (`search`, `status`, `ghost`, `createdFrom/To`,
  `sortBy`, `sortOrder`) so the existing `useJobs` hook is untouched.
- Ghost-day meter and outreach badge carry over as-is — they are typographic,
  not interactive.
- Job detail is a **full screen, not a sheet** — no room for a drawer over a
  list. Web's eight sections become collapsible blocks in the same order.
  Outreach contacts get tap-to-call and tap-to-email, which the web lacks.
- Status changes through a chip in the detail and a swipe action on the row,
  both hitting the existing `PATCH /api/jobs/:id/move`.

**Not built:** the kanban board. Drag across five columns is a bad phone
interaction at any width and `@dnd-kit` does not run natively (spec §4.2).
Résumé and cover-letter launchers degrade to read/copy links.

Skills: `expo-router`, `expo-native-ui`, `expo-ui`, `expo-animation`.

---
*Cold-start: read `docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md` §8 first — it is written to be read with no other
context. Repo root is `git rev-parse --show-toplevel` (this repo is worked on
from two machines; never hardcode a home path).*
