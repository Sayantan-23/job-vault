---
id: t-0c7hxn
title: "Next 16 feature adoption: React Compiler + typegen route props"
status: done
owner: coder
milestone: m-01
decisions: [d-0c7hxl]
created: 2026-08-26T07:54:02Z
updated: 2026-09-05T00:22:00Z
tags: [upgrade, frontend]
---

On top of t-0c7hxm (depends on it):

- Enable `reactCompiler: true` (+ `babel-plugin-react-compiler` dev dep) —
  auto-memoization for the kanban board and the big list pages. Verify build
  time stays tolerable and behavior is unchanged (tests + smoke).
- Adopt the generated `PageProps<'/route'>` helpers on dynamic routes
  (`/app/cover-letters/[id]`, any others the async-params sweep touches).
- Keep 16.3's Turbopack filesystem cache defaults (dev + build).

Scope per d-0c7hxl: Cache Components / Instant Navigations / `<Activity/>` /
TS7 deliberately deferred.

**This file was written after the work, not before it** — adoption backfill recorded in commit `bd2e2e14`.

