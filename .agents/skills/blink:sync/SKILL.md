---
name: blink:sync
blink_version: 0.5.2
description: Use when the tracker may have fallen out of step with the work — "sync blink", "is the board accurate", "check for status drift", "the statuses look wrong", "reconcile the tracker", "did we forget to close anything". Compares the .blink/ files against git history and the validator, reports what disagrees, and repairs only what you confirm.
---

# Blink sync

Status drift is what a tracker fails as. Nothing here is exotic: a task ships and
its file still says `planned`, two sessions pick the same id in the same minute,
a task sits `in_progress` for six weeks after it landed. The files are one
record of the work, git is another, and nobody ever compares them.

This skill compares them, and it is **read-only until you say otherwise**.

## The one rule that shapes everything below

There are two kinds of finding and they must never be printed as one list.

- **Established** — two records that both exist and contradict each other. A
  task file whose creating commit already said `status: done`. A `blocked` task
  whose every blocker is `closed`. No inference about anybody's intent is
  involved. The finding is not in question; sometimes the repair still is.
- **Needs a human** — an observation that suggests drift and cannot settle it. A
  task `in_progress` whose file has not moved in six weeks may have shipped,
  stalled or been abandoned, and the repository does not distinguish those three.

Merging them produces a ranked list of equally confident claims, which is how a
report gets ignored. `blink drift` already assigns `confidence` per finding.
**Carry that field through. Do not promote a question because it looks obvious
to you** — looking obvious is exactly what a question feels like from inside.

## Before anything: is there a tracker?

Look for `blink.json` at the project root. If it is missing, stop and say that
`blink init .` comes first — there is nothing to reconcile.

If `blink` is not on PATH, every `blink …` below is
`node <blink-checkout>/dist/cli/index.js …`. Ask for the checkout path rather
than guessing at one.

Read `blink.json`: `contentDir` names the content directory, and everything
below is relative to that rather than assuming `.blink/`.

## Phase 1 — gather (read only, writes nothing)

    blink drift . --json

That is the whole evidence pass. It reconciles three sources that are otherwise
never compared — each file's declared `status`, `updated` and `owner`; git's
per-file history with real timestamps; and everything `blink validate` knows is
structurally wrong — and it never writes.

The JSON carries `findings` (each with `code`, `confidence`, `evidence`,
`proposal`, `caution`, `dirty` and `group`), `validation`, `hygiene`,
`coverage` and `git`. Findings that share a `group` are one event seen once per
file — collapse them into a single row and repair them once. Read `git.available` first: when it is false, only the file-against-file
checks ran, and you must say so rather than reporting a clean git picture.

**If the command does not exist** — an older Blink — say so, then fall back to
`blink validate` plus `git log --format='%h %aI %s' -- .blink/` and
report only what those two can support. Do not reconstruct the whole procedure
by hand from sixty task files: a survey that costs more than the drift is a
survey nobody runs twice.

### What the codes mean

| Code | Kind | What it is |
|---|---|---|
| `duplicate_id` | established | Two files claim one id. Two sessions read the same "next" id at the same moment |
| `recorded_after_the_fact` | established | The commit that created the file already said `done` or `dropped` |
| `illegal_transition` | **question** | Git history shows a status jump the lifecycle does not allow. History may be squashed |
| `blocker_resolved` | established | `blocked`, and every id in `blocked_by` is now resolved |
| `milestone_all_tasks_done` | established | An `active` milestone with no unfinished task |
| `milestone_done_with_open_tasks` | established | A `done` milestone whose tasks are not |
| `milestone_work_started` | established | A `planned` milestone whose tasks are already moving |
| `run_ended_tasks_open` | established | A run record says `done` or `abandoned` and tasks it covers are still being worked |
| `stale_updated` | established | `updated` is a fortnight or more behind the last commit that changed the file |
| `shipped_while_open` | **question** | Commits name the id and never touch its file. Suggestive, not proof |
| `stale_in_progress` | **question** | `in_progress`, and silent for longer than the threshold |
| `run_stalled` | **question** | A run still `planned` or `running`, with lanes short of an ending, silent past the threshold. A live run and a dead one look identical from here |

`hygiene` and `coverage` are **not findings**. `hygiene` says what status task
files were created at — a repository where most tasks are born `in_progress` is
one where files follow the work instead of leading it. `coverage` counts commits
that neither touched `.blink/` nor named an entity id. Both are the shape
of a habit. Report them as one line each; never turn either into rows.

**`paused` counts as open work** for every comparison in this skill. A paused
task whose commits show a merged branch triggers `shipped_while_open` — propose
`done`, same as for a `blocked` task. The status is voluntary hold, not a
terminal state.

**Skip `archived: true` tasks** in all staleness nags (`stale_in_progress`,
`stale_updated`). An archived task is deliberately out of sight; its age since
the last commit is not a signal of drift. Report it if drift already sees a
finding for another reason, but never create a nag row solely because it is old.

## Phase 2 — report, in two tables

Print the established table, then the question table, under headings that say
which is which. One row per finding: id, code, the one-line summary, and its
evidence. Anything marked `dirty` gets an explicit marker — an uncommitted file
is what a second session mid-write looks like from here.

Then say what you will not do: nothing outside `.blink/` is touched, no
file is deleted, no date is moved backwards, and no repair is applied before the
next question is answered.

## Phase 3 — ask, once

Ask now, with both tables above the question. Offer the two groups separately —
"apply the established repairs" is one answer, and each question needs its own —
but ask it as **one** question. Do not walk the list file by file.

If nothing came back, say so plainly and stop. "No drift" is the good outcome
and it should not be padded with advice.

## Phase 4 — repair, only what was confirmed

### The two things this skill must never do

1. **Never rewrite history to tidy the board.** A file written late is a fact
   about how the work went. `created` is never moved backwards. A task recorded
   after the fact keeps its dates and gains a line in its **body** saying the
   file was written after the work — that sentence is the finding's whole
   repair. `/blink:tracking` says the same thing.
2. **Never guess.** Everything in the question table stays there until a human
   answers it. If the answer does not arrive, the finding is reported, not
   applied. A tracker that quietly closed the wrong task is worse than one that
   is visibly behind.

### Per code

- **`duplicate_id`** — renumber the file that arrived last: a fresh `blink id`
  for the type (the timestamp scheme makes a repeat collision near impossible;
  for legacy sequential ids the next free number is also acceptable),
  `git mv` it to match, and update every reference that pointed at the old id
  (`milestone`, `blocked_by`, `decisions`, `docs`) — references only ever point
  forward, so a grep for the id across `.blink/` finds all of them. Note
  the renumber in the body of the file that moved, so the id in an old commit
  message stays findable.

  **Never renumber a file with uncommitted changes** unless the person who owns
  it has said so in this conversation. That is the live-session case, and
  renaming a file out from under a session that is still writing it turns one
  duplicate into two broken files. When both are dirty, report and stop.
- **`recorded_after_the_fact`** — body line only, per rule 1 above. Do not
  change `status`, `created` or `updated`.

  Findings sharing a `group` were all created by the **same commit**, which
  means they are one event: an adoption backfill, or a session that wrote up its
  whole afternoon at the end of it. Say that once — in the project doc or a
  decision — rather than pasting the same sentence into thirty bodies. Report
  them as one row.
- **`illegal_transition`** — a question, and one with a common innocent cause:
  a squashed history shows only the endpoints of a sequence that was legal all
  the way through. Read the two commits the evidence names. Never edit a status
  backwards to make the recorded sequence legal — that is rewriting history to
  tidy the board, which rule 1 above forbids.
- **`blocker_resolved`** — clearing `blocked_by` is mechanical; choosing what
  the task becomes is not. `backlog`, `planned` and `in_progress` are all legal
  and only the owner knows which. Ask, then write both fields in one edit.
- **`milestone_all_tasks_done`** — set `status: done`. Never add a task list to
  the milestone while you are in there: tasks point at milestones, never back.
- **`milestone_done_with_open_tasks`** — two legal repairs, reopen or close.
  Ask which; do not pick the one that makes the board greener.
- **`milestone_work_started`** — set `status: active`. A milestone has no
  `in_progress`; that is the task enum.
- **`run_ended_tasks_open`** — the run record and the task files contradict
  each other, and the run is the one that made the claim, so the finding names
  it. There is still no mechanical repair: work out what actually happened to
  **each** task the evidence lists, one at a time, and write that answer into
  that task's own file.

  **Never close a set of tasks because a run says `done`.** A run ends when its
  lanes stop; that is a different event from the work being finished, and a lane
  that merged a half-done branch produces exactly this shape. Once every task
  carries an honest status, close the run's account of them —
  `blink run event <run-id> "<task-id>: <what actually happened>"` writes one
  line into the run's log, which is where the reconciliation belongs. Do not
  reopen a finished run to do it.
- **`stale_updated`** — set `updated` to the date git says the file last
  changed. That is a correction forwards, to a date the repository can prove.
- **`shipped_while_open`**, **`stale_in_progress`** — no mechanical repair
  exists. Read the commits the evidence cites, put the question to the owner,
  and write only the answer you are given.
- **`run_stalled`** — not yours to repair, and never promoted out of this
  table. A run that is still going and a run whose orchestrator died are the
  same shape from here, and finishing a live run strands whatever its lanes hold.

  `/blink:execute` is what reconciles a run: it re-reads the run record,
  `git worktree list` and `git branch --list "lane/*"`, reports what it found,
  and re-enters dispatch at the first wave that has not landed. Offer that
  first. Only when the owner says the run is genuinely dead does it get closed,
  with `blink run finish <run-id> --status abandoned` — and that closes the
  run, not its tasks, so anything it stranded is then answered task by task
  under `run_ended_tasks_open` above.

Bump `updated` on every file you touch, and keep each entity's edit to that one
file — that is what lets another session be working in the same directory while
you do this.

## Finish

Run `blink validate`. **Zero errors is the bar.** Then print, in this order:
what was changed and to what; what was confirmed and deliberately left alone;
and every question still open, so the list survives the end of the conversation.

If anything is still open, offer to write it into `.blink/` as a task —
"reconcile the tracker" is real work and this project tracks real work.

## Do not

- Do not write anything in phase 1 or 2.
- Do not merge the two tables, and do not re-rank a question upwards.
- Do not backdate `created`, or move any date backwards for any reason.
- Do not delete an entity file. Abandoned work is `status: dropped`.
- Do not renumber, rename or edit a file that has uncommitted changes without
  being told to.
- Do not touch anything outside `.blink/`. Drift in the code is not this
  skill's business.
- Do not write a count, a percentage or a progress figure into any file — they
  are derived on read, and a written copy starts drifting immediately.
- Do not run `blink drift` and then report from memory. Quote the evidence
  lines it gave you; they carry the shas and dates that make a finding checkable.
