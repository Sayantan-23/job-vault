---
id: x-0cgq5d
title: Mobile C1 auth + C2 primitives + serif swap
status: blocked
tier: subagents
created: '2026-08-31T07:29:37Z'
updated: '2026-08-31T08:38:19Z'
tags: []
tasks:
  - t-0ccxkl
  - t-0ccxkm
  - t-0cd5ka
gates:
  - make typecheck
  - make lint
  - make test
  - npm --prefix mobile run typecheck
  - npm --prefix mobile run lint
  - npm --prefix mobile test
  - blink validate
blocked_reason: 'Work landed and all seven gates are green on a47f27f, but the wave is visually unverified: the device pass was stopped mid-scroll after confirming 3 of 5 opacity cases. Four decisions also open: amend the stale d-0cdcga logout contract, MarkdownProse (16th primitive), @gorhom/bottom-sheet, and migrating app-header/fab onto IconButton.'
lanes:
  - task: t-0ccxkl
    state: ready
    attempts: 0
    wave: 1
  - task: t-0ccxkm
    state: ready
    attempts: 0
    wave: 1
  - task: t-0cd5ka
    state: ready
    attempts: 0
    wave: 1
---

## Log

- 2026-08-31T07:30:15Z — wave 1 dispatched: lane A t-0ccxkl (auth), lane B t-0ccxkm + t-0cd5ka (primitives + serif)
- 2026-08-31T07:46:05Z — t-0ccxkl: lane A ready at 3619107 — mobile gates green scoped to owned paths; package-wide blocked on lane B TDD stubs
- 2026-08-31T07:59:48Z — lane B ready at a47f27f — 15 of 16 primitives; MarkdownProse and bottom-sheet dep unresolved
- 2026-08-31T08:01:31Z — gate list corrected: mobile typecheck and lint needed 'npm run', not bare npm; all seven green on a47f27f
- 2026-08-31T08:38:19Z — device pass started then stopped mid-scroll on request: 3 of 5 opacity cases confirmed by exact pixel match; gallery, serif, auth screens and tab bar unchecked
