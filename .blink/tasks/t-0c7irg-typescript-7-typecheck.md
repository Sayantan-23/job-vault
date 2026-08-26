---
id: t-0c7irg
title: "Evaluate TypeScript 7 (native port) for frontend-next type checking"
status: backlog
milestone: m-01
decisions: [d-0c7hxl]
created: 2026-08-26T08:11:41Z
updated: 2026-08-26T08:11:41Z
tags: [frontend, tooling]
---

Deferred from the Next 16 upgrade per d-0c7hxl. Next 16.3's `next build` can
type-check with TypeScript 7 (the ~10x-faster native port) — bump the local
`typescript` dev dep to `^7` and verify `npm run typecheck`, editor LSP, and the
production build all agree with 5.x results before adopting. Consider the
backend too (NodeNext + Drizzle inference is the risk surface there); frontend
and backend can move independently.
