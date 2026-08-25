---
id: d-005
title: The root .env is the single source of truth for configuration
status: accepted
date: 2026-08-25
updated: 2026-08-25T12:30:00Z
tags: [config, docker]
---

## Context
Compose interpolates `${VAR}` only from the `.env` beside `docker-compose.yml`.
An app-local `.env` looks like it should work and silently does not: both dotenv
and Next refuse to overwrite a variable already in `process.env`, so the
compose-supplied value always wins. A valid `GEMINI_API_KEY` once sat in
`backend-express/.env` while the API reported AI as disabled.

## Decision
All values live in the root `.env` (gitignored), documented key-by-key in the
committed `.env.example`. The backend loads it through
`src/config/load-dotenv.ts`, resolved from the module's own path so it works
under tsx, vitest, drizzle-kit and `dist/`. Secrets are written `${VAR}` in
compose with no `:-` default, so an unset key makes compose warn out loud.

## Consequences
Never add a second `.env` next to an app. The one exception is a host-run
`npm run dev` in `frontend-next/`, which needs `.env.local` because Next only
auto-loads from its own directory; it holds no secrets and is unused under
Docker. `make doctor` reports keys present in `.env.example` and missing from
`.env`.
