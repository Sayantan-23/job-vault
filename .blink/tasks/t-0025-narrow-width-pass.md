---
id: t-0025
title: Narrow-width pass — JobDrawer / sheets, board columns, document workspaces
status: backlog
created: 2026-07-15
updated: 2026-08-25T12:30:00Z
estimate: M
tags: [frontend, responsive]
---

The remaining half of the /app responsive sweep. The mobile nav shipped
(merge `5e72dd7`, 2026-07-15); these surfaces were never given a 390px pass.

**Where it stands, verified 2026-08-25.** The primitives are not broken — the
sheet is `w-full` below `sm` and caps at `sm:max-w-2xl`, and the board scrolls
horizontally (`kanban-board.tsx:116`). What is missing is an actual pass at
390px over the JobDrawer's dense sections (outreach, timeline, reminders,
documents), board column widths and the résumé / cover-letter workspaces, which
were designed against the split layouts.

This one is settled in a browser, not by reading code — screenshot at 390 / 768
/ 1440 with the playwright-cli skill, light and dark.

Remember [[d-006]] and the container-query rule: multi-column /app pages use
`@container` + `@2xl:`, not viewport `lg:`, because the rail offsets the
viewport.
