---
id: t-0cqv2o
title: "Unify mobile screen action buttons: SpeedDial FAB across all screens, remove header leading buttons"
status: done
milestone: m-0cc02t
owner: antigravity
created: 2026-09-05T18:52:07Z
updated: 2026-09-05T18:58:30Z
tags: [mobile, ui]
decisions: [d-0cqv2p]
---

## Description

Enforce unified mobile action button design system rule across all screens:
1. Deprecate and remove leading action buttons from `AppHeader` so header titles are cleanly aligned and never crowded.
2. Adopt the bottom-right floating SpeedDial (`SpeedDial`) for all screen action affordances:
   - Jobs screen: Add job + Filter jobs.
   - Answers screen: New answer.
   - Job detail screen: Edit job + Delete job.
3. Update specifications and documentation to cement this convention.
