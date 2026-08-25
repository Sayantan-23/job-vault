---
id: getting-started
title: Getting started with this tracker
status: active
type: note
tags: [example]
---

Everything in `.blink/` is one markdown file per entity: milestones,
tasks, decisions, risks and docs. Frontmatter is state, the body is prose.

- The field reference is `.blink/SCHEMA.md`.
- The workflow agents follow is the `/blink:tracking` skill. A short form of
  it is injected into `CLAUDE.md`, which Claude Code loads on every turn, and a
  fuller one into `AGENTS.md` for harnesses that read a single root file.
- `/blink:setup` aligns a project to all of that — it reports what is missing
  and converts tracking that already exists elsewhere, after asking.
- `/blink:sync` is for later, once the tracker has been running a while: it
  compares these files against git history and reports where they disagree,
  repairing only what you confirm. `blink drift` is the read-only half of it.
- `blink validate` checks the whole directory and exits non-zero on errors, which
  makes it usable in CI and as a self-check after every write.
- `blink .` opens the dashboard.

A doc's filename must be exactly its id plus `.md` — this file is
`docs/getting-started.md` because its id is `getting-started`. That is the one
naming rule that differs from every other entity type.

Delete this file once you have real notes to keep here.
