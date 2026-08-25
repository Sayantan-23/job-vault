---
id: d-001
title: Track this project's work in Blink
status: accepted
date: 2026-08-25
tags: [process]
---

## Context
Work on job-vault is done by people and agents whose state lives in
scrollback. Nobody can answer "what is in flight, what is blocked, what was
decided and why" without re-reading a transcript.

## Options
- **Nothing** — cheapest, and the state stays invisible.
- **An issue tracker** — good for humans, awkward for agents, and it lives
  outside the repository so it drifts from the code.
- **Markdown in the repo** — git-tracked, reviewable in a pull request, readable
  with `cat`, writable by any agent with a filesystem.

## Decision
Markdown in the repository, one file per entity, in this directory.

## Consequences
The plan is versioned with the code and moves with a branch. It only stays
accurate if it is written as the work happens, which is what the tracking skill
is for. Replace this example with the first decision you actually make.
