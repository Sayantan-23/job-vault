---
id: t-0c7irf
title: "Use React <Activity/> to keep Board⇄List state alive across the toggle"
status: backlog
milestone: m-01
decisions: [d-0c7hxl]
created: 2026-08-26T08:11:41Z
updated: 2026-08-26T08:11:41Z
tags: [frontend, ux]
---

Deferred from the Next 16 upgrade per d-0c7hxl. React 19.2's `<Activity/>`
renders background UI with `display: none` while preserving component state and
cleaning up effects — a fit for the Jobs workspace Board⇄List toggle, where
switching currently unmounts the hidden view (scroll position, expanded rows,
in-flight drag state lost).

Behavior change, so it gets its own verification pass: toggle both directions
with filters applied, drag mid-flight, scroll restoration, and memory (both
views mounted simultaneously — check the kanban's dnd sensors don't fire while
hidden).
