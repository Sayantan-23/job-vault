---
title: job-vault
status: active
started: 2026-04-26
updated: 2026-08-25T12:30:00Z
---

JobVault is a "ghost-proof" job-application tracker and AI assistant for one
person running their own job search. It captures a job posting before it expires
(Chrome extension or URL paste), keeps the frozen snapshot readable after the
original 404s, tracks the application across a kanban pipeline with a ghost
meter for employer silence, records who was asked for a referral and whether
they replied, and generates tailored résumés and cover letters from reusable
personas.

## Goals

- A job posting captured once is readable forever, and no application goes quiet
  without the user noticing.
- Applying to a role costs a click and a review, not an evening of rewriting.

## Non-goals

- A multi-tenant SaaS. Single-user assumptions are deliberate — see the accepted
  risks on rate limiting and degraded modes.
- File storage. Documents are derived from structured content in code, never
  uploaded or rendered server-side ([[d-003]]).

## Where things stand

The Express 5 + Drizzle backend and the Next 15 app are the only stacks; the
original NestJS and Nuxt folders were deleted 2026-07-05 and live in git
history. Slices 0–9 plus the public pages and the editorial app shell are
shipped and merged ([[m-01]]) — `develop` and `master` are level.

Open work is the backlog in `tasks/`: email delivery, Google OAuth, the outreach
follow-ups, extension hardening and release, and a real narrow-width and QA
pass. Nothing is in flight.

## How work is tracked here

Every milestone, task, decision, risk and doc in this directory is one markdown
file. Frontmatter is state; the body is the thinking. See `SCHEMA.md` for the
fields and `/blink:tracking` for the workflow. Run `blink validate` after any
change.

`progress.md` in the repository root stays the **changelog** — what shipped,
slice by slice, with commits. It is history, not a task list; the open items
that used to live there are now tasks here.
