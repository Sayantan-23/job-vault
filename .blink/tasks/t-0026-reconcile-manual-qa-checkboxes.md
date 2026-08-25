---
id: t-0026
title: Manual browser QA sweep for the slices that never got one
status: backlog
created: 2026-06-16
updated: 2026-08-25T12:30:00Z
estimate: M
tags: [qa, verification]
---

Eleven slices carried an unchecked "Manual browser pass + merge to master" line
in `progress.md`. This is the one task that survives from them.

**The merge half is done.** Verified 2026-08-25: `develop` and `master` both sit
at `a9be1cb` and every slice branch is merged, Slice 9 included (merge
`2947a15`) — so CLAUDE.md's "awaiting merge" and the per-slice "pending user"
notes were stale paperwork, now corrected in `progress.md`.

**The QA half is real.** Nobody recorded a browser pass for: Slice 0 (light/dark,
`/about`), Slice 2 (Add-Job modal, drawer deep-link), Slice 3 (drag-and-drop,
card → drawer), Slice 3.5 (Board↔List toggle, `?view=` survives refresh),
Slice 4 (final pass), Slice 5 (search / sort / paginate / reset, deep-link SSR,
hybrid drag while filtered), Slice 5 follow-up (column funnel menus),
timeline + settings (dark-mode flip, timeline paging), URL scraping (paste a
Naukri/LinkedIn URL through the modal) and Slice 9 (outreach add/edit/delete,
badges).

Some of it is certainly fine — the funnel-menu complaint that shipped with
Slice 5 is already fixed (`jobs-filter-menu.tsx:66,74` close the popover on
apply and clear). Run it as one sweep against the demo seed (`make seed`) rather
than slice by slice, and fold whatever it finds into [[t-0025]] if it is
width-related.
