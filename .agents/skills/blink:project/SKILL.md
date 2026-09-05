---
name: blink:project
blink_version: 0.5.2
description: Use when starting a new project, adopting an existing codebase into planned milestones, planning the next milestone, reviewing the agent roster, or asking where the project stands — "plan this project", "set up milestones", "plan the next milestone", "what agents do we need", "project status".
---

# Blink project

job-vault tracks its work in `.blink/`. This skill is a thin
router: it detects state and loads exactly one reference page. Heavy procedure
bodies live in `references/` and are loaded one at a time, only when routed to.

## State detection

1. Run `blink validate` — note the error and warning counts.
2. Count entities: `ls .blink/milestones/ .blink/tasks/ 2>/dev/null | wc -l`.
3. Note any subcommand — the first word of the invoking message after the skill name.

Then route to exactly one reference:

| State | Load |
|---|---|
| Empty or near-empty tracker, no source code in the directory | `references/01-interview.md` |
| Empty or near-empty tracker, existing source code present | `references/02-align.md` |
| Subcommand `agents` | `references/03-agents.md` |
| Subcommand `milestone` or `plan` | `references/04-milestone.md` |
| Subcommand `status` | inline read-only report (see below), zero writes |
| Subcommand `help` | print subcommand table, zero writes |
| Populated tracker, no subcommand | print status summary + subcommand table, load nothing |

Free text after a subcommand is context — absorb it, adaptive-skip whatever
it already answers.

## Inline status report (subcommand: status)

Read `.blink/project.md`, count milestones by status, count open
and done tasks. Print as a compact table. Zero writes. No questions.

## Subcommand table

| Subcommand | What it does |
|---|---|
| `milestone` | plan a new milestone or extend an existing one |
| `agents` | review or update the agent roster |
| `plan` | pick the next unstarted milestone and break it into tasks |
| `status` | read-only summary, zero writes |
| `help` | print this table, zero writes |

## Hard rules (stated once, apply everywhere)

- Load exactly ONE reference per invocation.
- Every write follows `/blink:tracking`; run `blink validate` after every
  write batch. Zero errors is the bar before calling anything done.
- Adaptive-skip: whatever the invoking message or an existing entity already
  answers is never re-asked.
- Orchestration policy is read from `.blink/project.md` field
  `orchestration` (absent = ask once, offer to save as default).
- Field definitions live in `.blink/SCHEMA.md`; cite it, never restate it.
