---
id: t-0c7hxo
title: "Next 16: Docker rebuild, live smoke, full gates, merge to develop"
status: done
owner: main
milestone: m-01
decisions: [d-0c7hxl]
created: 2026-08-26T07:54:02Z
updated: 2026-08-26T08:28:06Z
tags: [upgrade, verification]
---

Depends on t-0c7hxm + t-0c7hxn.

- `make rebuild` (new deps) and confirm dev stack comes up on 16.
- Live smoke the risk surface, in-browser (playwright-cli, subagent):
  - login → /app/jobs (proxy.ts gate + silent refresh),
  - socket.io notifications handshake through the rewrite
    (`skipTrailingSlashRedirect` + trailing-slash entries still honored),
  - an AI generation call (the 180s `proxyTimeout` path),
  - résumé PDF preview (`@react-pdf/renderer` under Turbopack, transpilePackages
    decision), Board⇄List toggle + drag, /extension/authorize page.
- `make gates` (backend + frontend suites + production build) green.
- `make build-web` (production Docker image builds on 16).
- Merge `upgrade-next-16` → `develop` (no push; user pushes).
