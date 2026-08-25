---
name: blink:tracking
blink_version: 0.5.2
description: Use when planning, starting, finishing, blocking or dropping work in this repository, when a real technical choice gets made, or before reporting progress. Keeps the Blink tracker in step with the work.
---

# Blink tracking

job-vault tracks its work in `.blink/`: one markdown file per
entity, YAML frontmatter for state, body for prose. The tracker is only worth
anything if it is written as the work happens, which means you write it.

The field reference is `.blink/SCHEMA.md`. Read it before your first
write. You do **not** need Blink installed to follow this — the format is plain
markdown and the rules are all here.

## The lifecycle

    backlog → planned → in_progress → done
                 ↘ dropped    ↘ blocked
                         in_progress ⇄ paused
                             blocked → paused
                              paused → planned

A task file is created at `backlog` **while the work is still being planned**,
not when someone starts it. That is the whole point: the file is the record, and
a record written after the fact is a summary. It becomes `planned` once it is
planned and queued, `in_progress` when it is picked up, and `done` when it
ships. `dropped` is a terminal exit; `blocked` is a hold on an external
dependency; `paused` is a voluntary hold that can return to `in_progress` or
`planned`. Nothing is ever deleted.

## The contract

Every status named below is from the **task** enum — the eight rules are about
tasks. Each entity type has its own enum and they do not overlap: a milestone
being worked on is `active`, never `in_progress`, and a risk is `open`.
`SCHEMA.md` lists every enum; check it before setting a status on anything
that is not a task.

1. **Planning work** → create the task file now, `status: backlog`, and point it
   at its milestone. Move it to `status: planned` once the plan is settled and
   it is queued. **Never edit the milestone** — references only ever point
   forward, so a milestone never lists its tasks and you never touch two files
   to move one task. New ids are **generated, never counted**: `blink id t`
   (or `m`/`d`/`r`), or without Blink installed
   `node -e 'console.log((Math.floor(Date.now()/1000)-1767225600).toString(36).padStart(6,"0"))'`
   behind the type letter. Counting up from the highest existing id collides
   the moment a second writer does the same on another clone; existing
   sequential ids stay as they are.
2. **Starting work** → set that task's `status: in_progress`, set `owner` to
   your agent name, bump `updated`. Before the work, not after it. In a
   worktree lane, skipping that is visible: commits landing in a lane whose
   tracker has not moved are reported on the dashboard as **unrecorded work**.
   `created` and `updated` take a full ISO timestamp with a zone —
   `date -u +%Y-%m-%dT%H:%M:%SZ` — and you should write one. A bare
   `YYYY-MM-DD` still validates and always will, but you touch this tracker
   several times an hour: at day resolution, a task created, started and
   finished before lunch records the same string three times, and neither
   "recently updated" nor `blink drift` can order what happened.
3. **Finishing** → `status: done`. **Never delete a file.** Abandoned work
   becomes `status: dropped`, which keeps the history and keeps it out of the
   progress denominator.
4. **A real choice made** → write a decision file and link its id from the task
   that implements it. A choice worth explaining twice is worth writing once.
5. **Stuck** → `status: blocked` with `blocked_by` pointing at a risk id.
   Create the risk file first if it does not exist; a blocked task with no
   blocker is rejected by validation.
6. **After any write** → run `blink validate`. Exit `0` means clean. Fix
   anything it calls an error before you move on.
7. **Pausing** → `status: paused` with `paused_reason` explaining the hold.
   Resuming clears `paused_reason` and returns the task to `status: in_progress`
   or `status: planned`. `/blink:pause` and `/blink:resume` do both
   correctly — prefer them to hand-editing the fields.
8. **Parallel work** → anything beyond a single task runs through
   `/blink:execute`. A single task you just do. The executor reads
   `orchestration` from `project.md`, picks the tier, writes the run record
   and enforces the gates; do not pick a tier or dispatch lanes by hand here.
   Three rules hold across every run, and they are the ones that matter to a
   tracker write: the **orchestrator is the sole writer of task state and of the
   run record**; **lanes never write the run file**; and **task ids are
   pre-created before dispatch**, so no two lanes mint the same id. The
   dashboard reads every worktree of the project and folds them into one board,
   so a lane's tracker writes are visible from outside the lane as soon as they
   are made, and there is nothing left to reconcile at merge time. The CLI does
   not fold: `blink validate` and `blink drift` each read the checkout they
   run in, so their counts are that checkout's alone.

Across lanes the board shows the **most advanced** status any lane reports, and
it keeps every other lane's account beside it instead of discarding them — lanes
that **disagree** about a task's status surface as a collision rather than one of
them quietly winning. Lanes that agree do not: two of them sitting at
`in_progress` on one task reads as agreement, so nothing flags a double claim
and only the pre-created id list keeps lanes off each other's work. Merged work
goes quiet by itself: once a lane's tracker matches the main checkout, its
markings disappear from the board and from every entity it touched, so there is
no cleanup pass to remember — its row in the worktrees view does stay, carrying
a hint to prune the worktree itself.

If you suspect the board has already fallen behind the work — a status that
looks wrong, a task nobody closed — do not fix it by eye. `blink drift` reports
where these files and git disagree and writes nothing, and `/blink:sync`
turns that report into repairs you confirm one at a time.

## Why it is shaped this way

Forward references only, so two agents working at once touch different files.
Fixed status enums, so nothing invents a vocabulary the viewer cannot read.
Frontmatter is state, the body is the thinking — put the reasoning in the body,
because that is the part a human reads six weeks later.

## Do not

- Do not open a task at `in_progress` for work you have already finished. If the
  file did not exist while the work was happening, say so in the body rather
  than backdating it.
- Do not delete an entity file. Use `dropped`.
- Do not list tasks inside a milestone, or blocked tasks inside a risk.
- Do not invent a status, a severity or a doc type. The lists in `SCHEMA.md` are
  the whole vocabulary.
- Do not carry a task status onto another entity. A milestone is
  `planned` | `active` | `done` | `dropped` and nothing else.
- Do not write computed numbers — progress and counts are derived on read.
- Do not report a task done without setting `status: done` in its file. The file
  is the record; the chat transcript is not.
