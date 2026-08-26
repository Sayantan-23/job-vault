---
id: t-0c7s5n
title: "Shared list-page header toolbar primitive (New button + search slot)"
status: backlog
milestone: m-01
created: 2026-08-26T13:40:00Z
updated: 2026-08-26T13:40:00Z
tags: [frontend, ui, consistency]
---

Audit (2026-08-26) found the list-page header actions row hand-rolled per page
with drift: cover-letters New button `size="sm"` (h-9) vs h-10 elsewhere;
"icon-only" mobile buttons keep `px-4` instead of `size="icon"`; jobs search
`basis-full` (own line below `sm`) vs answers `basis-0` (inline);
`SearchInput` lives in `components/jobs/` but answers imports it.

Scope when picked up:
- Shared New-button component (label + Plus, auto `hidden sm:inline`,
  `aria-label`, one size) replacing the 4 hand-rolled copies.
- `search` slot on `PageHeading` so the actions row owns the mobile
  line-break decision once.
- Move `SearchInput` to `components/ui/`.
- Surface a visible ⌘K hint (currently bound but invisible everywhere); the
  per-instance global keydown listener also races if two SearchInputs mount.

Constraints (user, 2026-08-26):
- **Jobs page header stays visually as-is for now** — do not restyle it in
  this task; it may be revisited later. Extraction must be a visual no-op for
  jobs or exclude it.
- No page is the canonical reference. Goal is one pattern per concern
  app-wide, not "match jobs".
