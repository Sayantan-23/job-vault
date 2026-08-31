---
id: x-0cgq5d
title: Mobile C1 auth + C2 primitives + serif swap
status: planned
tier: subagents
created: '2026-08-31T07:29:37Z'
updated: '2026-08-31T07:29:37Z'
tags: []
tasks:
  - t-0ccxkl
  - t-0ccxkm
  - t-0cd5ka
gates:
  - make typecheck
  - make lint
  - make test
  - npm --prefix mobile typecheck
  - npm --prefix mobile lint
  - npm --prefix mobile test
  - blink validate
lanes:
  - task: t-0ccxkl
    state: pending
    attempts: 0
    wave: 1
  - task: t-0ccxkm
    state: pending
    attempts: 0
    wave: 1
  - task: t-0cd5ka
    state: pending
    attempts: 0
    wave: 1
---

