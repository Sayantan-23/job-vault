---
name: blink:project
blink_version: 0.5.2
description: Milestone planning — picks scope, breaks it into tasks with the user, writes the milestone and its backlog tasks, then hands the confirmed task set off to `/blink:execute`, which runs it.
---

# Milestone planning

Use for subcommand `milestone` (plan a specific milestone) or `plan` (pick
the next unstarted one). Free text after the subcommand is scope context —
absorb it, adaptive-skip whatever it answers.

## Pick-next (subcommand: plan)

If no milestone is named, read `.blink/milestones/` and propose the
next unstarted milestone ordered by `order`. Show a one-line summary per
candidate and ask which to staff. Absorb scope refinement in the reply.

## Scope and task breakdown

Present the proposed scope as a numbered list. For each task, collect:

- **Title** — one line, action verb, concrete outcome.
- **Body notes** — what "done" means; any known constraints.
- **Estimate** — XS / S / M / L / XL.
- **Blocked-by wiring** — if the task depends on a risk, name the risk id.
  Risks must exist before any task points at them.

Ask once with the full list on screen. Do not ask per task. Accept additions,
removals and re-estimates in the same reply.

## Write on confirmation

Write in this order:

1. **Risks** — any `blocked_by` targets that do not yet exist. Status
   `open`, severity from context or `medium` if unstated. Ids continue
   the existing sequence.
2. **Milestone** — `status: planned`, `order`, `summary`. Id continues
   the existing sequence.
3. **Tasks** — each at `status: backlog`, pointing at the new milestone.
   Ids continue the existing sequence. Flip to `status: planned` once the
   set is agreed and before any dispatch.

Run `blink validate` after writing the complete set. Zero errors before
calling this done.

## Hand off to the executor

Planning ends with a **confirmed task set in the tracker**. That is the
deliverable of this page. Running it is a different skill, and the next move is:

    /blink:execute <milestone-id>

`/blink:execute` owns pre-flight (it derives the waves, the tier and the
gate list from the tracker), the confirmation stop, dispatch, the merge gates and
the run record a fresh session can resume from. **Do not restate its procedure
here** — the same rule this skill already applies to `/blink:tracking`: cite
it, do not restate it. A second copy of a procedure drifts from the real one from
the day it is written, and the drift is invisible until someone follows the stale
copy.

Two things stay with this page, because they are planning decisions rather than
run decisions:

1. **Read `orchestration` from `.blink/project.md`.** Absent means ask
   once, and offer to write the answer back to `project.md` as the project
   default. It is a project-level preference and this is where the project is
   being described; the executor reads the field, it does not interview for it.
   Tier definitions live in `/blink:tracking`; cite them, do not restate them.
2. **Say what the run will look like**, in one or two sentences, so the hand-off
   is not a surprise: roughly how many tasks, whether they can go at once or
   depend on each other, and which tier the `orchestration` field implies. Frame
   it as an expectation, never as a plan — the real waves, tier and gates come out
   of `blink plan` inside `/blink:execute`, and a number promised here that
   disagrees with the one printed there reads as a bug in the tracker.

**`orchestration: inline`** is the one case with no hand-off: no dispatch, no
worktrees, no run to orchestrate — this session does the work itself, following
`/blink:tracking` for every status write.

This page never dispatches a subagent and never creates a worktree, whatever the
fan-out. A dispatch from here has no run record behind it, so nothing survives a
summarized session, nothing enforces the merge gates, and a resume has no file to
read.

## Adaptive-skip

If the invoking message already names a milestone and tasks, skip pick-next
and the breakdown step. Present the derived list for confirmation instead.

## Do not

- Do not write tasks before the milestone file exists.
- Do not write a milestone before any risk it depends on exists.
- Do not write a computed count or percentage into any file.
- Do not dispatch a subagent, create a worktree or start a branch from this page.
  Planning hands off to `/blink:execute`; work dispatched from here has no
  run record, no gates and nothing to resume from.
- Do not restate `/blink:execute`'s procedure — its tiers, its waves, its
  gate list or its run record commands. Name the skill and stop.
- Do not promise waves, a tier or a gate list as fact. `blink plan`, inside
  `/blink:execute`, derives all three.
