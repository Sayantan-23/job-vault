---
id: t-0c7kct
title: "Adopt TypeScript 7 once typescript-eslint supports TS >=7.1"
status: backlog
milestone: m-01
decisions: [d-0c7hxl]
created: 2026-08-26T08:46:05Z
updated: 2026-08-26T08:46:05Z
tags: [frontend, tooling]
---

Blocked-in-practice follow-up to the t-0c7irg evaluation (verdict: defer).
Everything except linting already works on typescript@7.0.2 — zero new errors,
strict flags enforced, `next build` engages it, tests unaffected.

Trigger: typescript-eslint ships TS ≥7.1 support
(typescript-eslint/typescript-eslint#10940) AND `eslint-config-next` consumes
it. Then the migration is:

1. `typescript` → `^7` in frontend-next (drop the `overrides` workaround if
   present; plain install should resolve once peers allow it).
2. Remove `baseUrl` from `frontend-next/tsconfig.json` (TS5102: removed in 7;
   `paths` already resolves relative to the tsconfig dir).
3. Re-run the t-0c7irg checklist: typecheck (expect ~5x), lint (the former
   blocker), tests, `make build-web`.
4. Separately evaluate backend-express (NodeNext + Drizzle inference risk).

See t-0c7irg's body for the full eval data, incl. the `--legacy-peer-deps`
false-error trap.
