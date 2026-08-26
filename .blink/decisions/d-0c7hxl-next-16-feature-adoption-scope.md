---
id: d-0c7hxl
title: Next 16 upgrade — which new features to adopt now
status: accepted
date: 2026-08-26
created: 2026-08-26T07:54:02Z
updated: 2026-08-26T07:54:02Z
---

## Context

Upgrading frontend-next from Next 15 (^15.0.3, webpack) to Next 16.3. The user
wants a "worthy" upgrade — adopt new features, but only where they pay for
themselves. The app is fully dynamic (auth'd, data client-fetched via TanStack
Query), which rules out most of the server-caching story.

## Options

Considered: Turbopack (default), React Compiler, `next typegen` PageProps
helpers, Cache Components / `"use cache"` / PPR, Instant Navigations
(`partialPrefetching`), `<Activity/>` for Board⇄List, `useEffectEvent`,
TypeScript 7 type checking, Turbopack filesystem cache, DevTools MCP.

## Decision

Adopt now:
- **Turbopack** dev + build (the 16 default; drop webpack-era workarounds that
  no longer apply, keep the rewrites/proxy config).
- **React Compiler** (`reactCompiler: true`) — auto-memoization for the kanban
  board / large lists; zero code change.
- **Typegen route-prop helpers** (`PageProps<...>`) on dynamic routes touched by
  the async-params migration.
- **Turbopack filesystem cache** — on by default in 16.3, keep it.

Defer (each a follow-up, not this branch):
- **Cache Components / PPR / Instant Navigations** — server-cache model doesn't
  fit an auth'd per-user app; public landing is static enough already.
- **`<Activity/>` for Board⇄List state retention** — real UX win but a behavior
  change; separate slice-sized change with its own verification.
- **TypeScript 7** — separate risk surface; revisit once 16 is settled.

## Consequences

Upgrade branch stays mechanical + low-risk; the two deferred ideas with real
value (`<Activity/>` toggle, TS7 typecheck speed) become backlog items instead
of riders on an infrastructure change.
