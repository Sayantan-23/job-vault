---
name: blink:project
blink_version: 0.5.2
description: Existing-code alignment — surveys the repo, derives the same entity set the interview produces, presents as one table for confirmation, then writes. Never restructures code.
---

# Existing-code alignment

Use when the tracker is empty or near-empty but existing source code is
present. Derives the same entity set the interview would produce, from the
repo itself rather than from questions. Follows the same survey-report-
confirm-write pattern as `/blink:setup`: reads first, presents everything
for one confirmation, writes only after a single yes. Never restructures code.

## Phase 1 — survey (read only, writes nothing)

Answer all of these before writing a line to `.blink/`:

1. **README** — purpose, users, top-level structure. Captures the source for
   the project overview verbatim.
2. **Package manifest** — `package.json`, `pyproject.toml`, `Cargo.toml`, or
   equivalent. Stack, runtime, key dependencies.
3. **Source layout** — top-level directories, entry points, test patterns.
4. **Git log themes** — `git log --oneline -40` — cluster commit messages into
   work themes; each theme is a milestone candidate.
5. **Open TODOs** — grep for `TODO`, `FIXME`, `HACK`, `XXX` in source.
   Each actionable item is a `backlog` task candidate.
6. **Existing tracking** — `docs/project/STATE.md`, `TODO.md`, `BACKLOG.md`,
   issues exports. Convert via `/blink:setup` rules; do not duplicate.

## Phase 2 — derive and present

Build the entity set, then present as one confirmation table:

    | Entity     | Id      | Title / summary                  | Notes           |
    |------------|---------|----------------------------------|-----------------|
    | project.md | —       | <name from README>               | status: active  |
    | doc        | <slug>  | Project spec                     | type: spec      |
    | decision   | d-NNN   | Adopt Blink for tracking         | date: today     |
    | milestone  | m-NN    | <first git-log theme>            | status: planned |
    | task       | t-NNNN  | <first TODO or theme item>       | status: backlog |

State clearly what you will NOT do: no code is restructured; nothing outside
`.blink/`, `CLAUDE.md`, `AGENTS.md` and `.claude/` is modified;
every source file stays where it is.

## Phase 3 — ask, once

Show the table. Ask: "Does this look right? Any milestones to add, rename or
drop?" Do not ask file by file. Do not ask again per entity.

## Phase 4 — write on confirmation

Same order as the interview: project.md first, then docs, decisions, milestones,
tasks. Ids continue the existing sequence; never restart at t-0001 or m-01
if the directory already holds entities.

Run `blink validate`. Zero errors before calling this done. Print the created-
entity map: counts by type, and anything found but deliberately not converted.

## Adaptive-skip

If `.blink/project.md` already has content, read it and skip whatever
it settles. If milestones already exist, do not propose ones that duplicate them.

## Do not

- Do not write before Phase 3 confirmation.
- Do not restructure code or rename source files.
- Do not copy a percentage, fraction or count into any entity file.
- Do not invent tasks — only convert work that is visible in the repo.
- Do not delete any source file.
