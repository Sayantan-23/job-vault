---
id: t-0cqslg
title: Mobile jobs — Google Keep-style speed-dial FAB, list/kanban switch, and edit job sheet
status: done
milestone: m-0cc02t
created: 2026-09-05T23:28:00Z
updated: 2026-09-05T23:40:00Z
estimate: M
tags: [mobile, expo, jobs, ui]
---

Add Google Keep style speed-dial floating action button on jobs list and single job screen, add list/kanban view switch button in jobs header, and implement edit job bottom sheet.

**Done when**
- Header switch button (icon only) placed before the Job page title toggles between List and Kanban views.
- Kanban board view on mobile displays columns grouped by status, with cards showing title, company, location, outreach, ghost meter, and status.
- Speed-dial FAB component (`SpeedDial`) displays Google Keep / hamburger style vertical stack of circular icon buttons with subtle backdrop scrim.
- Jobs screen FAB has two icon buttons: Add Job (`+`) and Filter (`SlidersHorizontal`).
- Single job screen replaces fixed bottom bar with SpeedDial FAB showing Edit (`Pencil`) and Delete (`Trash2`, destructive).
- Edit job sheet allows modifying title, company, location, salary range, source URL, and notes, calling existing `PATCH /api/jobs/:id`.
- All mobile tests, lints, typechecks, and blink validation pass.
