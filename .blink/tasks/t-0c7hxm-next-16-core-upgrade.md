---
id: t-0c7hxm
title: "Next 16 core upgrade: deps, codemods, proxy rename, config, gates green"
status: done
owner: coder
milestone: m-01
decisions: [d-0c7hxl]
created: 2026-08-26T07:54:02Z
updated: 2026-09-05T00:22:00Z
tags: [upgrade, frontend]
---

Bump `next` to 16.3.x + `react`/`react-dom`/`@types/react*` to matching
versions in `frontend-next/`. Mechanical migration per the official v16 guide:

- `src/middleware.ts` → `src/proxy.ts` (+ function rename; matcher unchanged;
  now Node runtime — fine, it already fetches the backend for refresh rotation).
- Async request APIs: remove any remaining sync `params`/`searchParams`/
  `cookies()` access (codemod `next-async-request-api` + manual sweep).
- `next.config.ts`: Turbopack is default — re-evaluate `transpilePackages`
  (`@react-pdf/renderer` was a webpack-only ESM workaround), keep rewrites +
  `skipTrailingSlashRedirect` + standalone output; verify `proxyTimeout` still
  applies under 16.
- `next lint` removal: migrate lint script if it uses it.
- Fix whatever typecheck/tests/build surface after the bump.

Done = `npm run typecheck && npm run lint && npm run test && npm run build`
green in `frontend-next/` on the new stack. Docker smoke is t-0c7hxo.

Security driver: 15.0.3 predates the middleware-bypass fix (CVE-2025-29927)
and months of patches; 16.x Active LTS gets monthly security releases.

**This file was written after the work, not before it** — adoption backfill recorded in commit `bd2e2e14`.

