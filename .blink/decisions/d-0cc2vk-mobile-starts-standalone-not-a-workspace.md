---
id: d-0cc2vk
title: mobile/ starts standalone; workspaces wait for a second real consumer
status: accepted
date: 2026-08-29
created: 2026-08-29T00:00:00Z
updated: 2026-08-29T00:00:00Z
tags: [mobile, architecture, tooling]
---

## Context

Choosing Expo over Flutter ([[d-0cc01s]]) was justified by reusing the existing
TypeScript layer — 25 TanStack Query hooks, the Zod schemas, the shared types,
`lib/api-client.ts`. The obvious conclusion is npm workspaces with
`packages/shared` from day one, so the contract cannot diverge.

Research says the mechanics are no longer the problem. **Expo SDK 52+ configures
Metro for monorepos automatically** — the old `watchFolders` /
`nodeModulesPaths` / `extraNodeModules` configuration is now explicitly
something to *delete*, not write. This repo is on npm, which also sidesteps the
well-documented EAS Build/pnpm friction (EAS internally assumes Yarn).

The ecosystem's hard problem — sharing *UI* across web and native via
`react-native-web`, Solito, Tamagui — does not apply. [[d-0cc24z]] already
settled that mobile UI is deliberately not the web UI. Worth noting
`react-native-web` is incompatible with Turbopack, which the web app moved to in
the Next 16 upgrade, so that path would have cost the bundler too.

So the question is not *can we* but *when*.

## Decision

**`mobile/` starts as a standalone app beside `backend-express/`,
`frontend-next/` and `extension/`.** Types are copied, not shared. Workspaces are
adopted later, when there is a second consumer that actually forces it.

**The lift trigger, named in advance so this does not drift into permanent
duplication:** the moment `api-client` needs the injectable token provider from
[[d-0cc1x6]] to serve both the cookie and Bearer transports from one module.
That is the first piece of code with two genuine consumers and a real cost to
duplicating. Until then, ~400 lines of copied types is cheap and reversible.

## Consequences

- **The real cost of workspaces here is Docker, not the sharing.** Compose
  bind-mounts `./frontend-next:/app` with an anonymous volume shadowing
  `/app/node_modules`. Under workspaces, dependencies hoist to a **root**
  `node_modules` outside that bind mount, so the container must mount the repo
  root instead. That is a `docker-compose.yml` + Makefile change touching the web
  app that is currently shipping. Doing it during C0 would mean debugging Metro
  and Compose at the same time.
- Three `package-lock.json` files (backend, frontend, extension) become one on
  adoption. Usually uneventful; occasionally surfaces a latent version conflict.
- `backend-express` should **not** join the workspace when it happens. It is the
  API's server; a shared `packages/types` consumed by the clients is the useful
  part, a four-way dependency graph is churn.
- When the lift happens, shared packages must **export raw TypeScript, not
  pre-compiled JS** — the consistently reported failure mode is module-format,
  source-map and type-definition pain from compiling first.
- Risk accepted: two copies of the types can drift in the window before the
  lift. Mitigated by the trigger above being an early, concrete event rather
  than a vague "when it hurts".
