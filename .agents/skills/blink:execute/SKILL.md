---
name: blink:execute
blink_version: 0.5.2
description: Use to actually run work that is already in the tracker — "run this milestone", "execute these tasks", "dispatch this work", "run m-xyz", "orchestrate the next milestone", "resume the run", "pick up where the run left off". Derives waves, a tier and a gate list from .blink/, shows that plan and stops for confirmation, then dispatches it across waves and lanes, verifies every merge, and records it all in a run record a fresh session can resume from.
---

# Blink execute

job-vault keeps its plan in `.blink/`. This skill runs it.

A run is a work set that is **already in the tracker**, worked out into a plan of
waves and lanes, **shown to you and stopped on**, then dispatched, verified at
every merge, and written into a run record that a fresh session can resume from.

This page routes. It does not teach: each phase's procedure is one reference file,
opened when you reach that phase and not before.

## What this is not

Each of these has cost someone a bad run. The reason is given so the rule
survives contact with a plausible-sounding exception.

- **No planning.** Free text that names nothing in the tracker is a handoff to
  `/blink:project`, never an invented task. A task this skill made up has no
  agreed scope and no owner, so nothing it produces can be reviewed against
  anything.
- **No scheduling.** A run executes now, in this session. There is no queue, no
  cron and no detached background run — a run nobody is watching cannot be
  stopped when its first wave comes back wrong.
- **No automatic conflict resolution.** A conflict is resolved by the lane that
  caused it, inside its own worktree, with the context that wrote the code.
  Resolving it here is code work in the one thread that must not do code work.
- **No new agent types.** `blink-orchestrator`, `blink-core-builder`,
  `blink-ui-builder` and `blink-reviewer` already exist and are what get
  dispatched. Inventing a fifth means dispatching an agent with no definition.
- **Nothing in Blink ever runs `git worktree`.** Blink is read-only about git.
  This skill instructs an agent and *the agent* runs git, so every branch and
  worktree in the repository has a person or an agent behind it, not a library.

## Prerequisites

- **`blink.json` at the project root.** If it is missing, stop and say
  `blink init .` comes first — there is no tracker here to run.
- **Read `contentDir` from `blink.json`.** Everything below is relative to
  that, rather than assuming `.blink/`; a project that moved its content
  directory is the normal case, not an exotic one.
- **If `blink` is not on PATH**, every `blink …` below is
  `node <blink-checkout>/dist/cli/index.js …`. Ask for the checkout path rather
  than guessing at one.
- **Never run `npx blink`.** That name belongs to a different package on the
  public registry; `npx` will fetch and execute a stranger's code against this
  repository.

## The two rules that govern every phase

Stated here rather than in one reference, because they get violated in whichever
phase the reader skipped to.

1. **You are the sole writer of `.blink/`.** Sub-orchestrators and their
   subagents never touch it, and every dispatch you write says so explicitly.
   Two writers on one tracker across several worktrees is how entries get
   clobbered and how the run record stops being trustworthy.
2. **Your context is the scarce resource.** You do not read implementation code,
   you do not inline a lane's transcript, and you never hold the run record's
   contents — every ledger write is one command that prints one line. The run
   record is your memory: anything you would need to remember is a field in it,
   so a summarized or restarted session re-reads rather than recalls.

   The failure mode is not a crash. A full orchestrator summarizes, loses a lane
   path or a gate result, and keeps dispatching against a picture that is no
   longer accurate — while the ledger still looks maintained.

## Phase map

| Phase | Reference | Open it |
|---|---|---|
| 0 · already running? | *(inline, below)* | first, always |
| 1 · derive, show, stop | `references/01-preflight.md` | now |
| 2 · dispatch and land | `references/02-dispatch.md` | only once the plan is confirmed |
| 3 · resume and reconcile | `references/03-resume.md` | only when a run is already `running` |

**Reading rule: open one of these at a time.** Loading all three up front spends
the context the run itself needs, which is the whole failure this design exists
to prevent.

## Phase 0 — is a run already live?

If `.blink/runs/` holds a run with `status: running`, this invocation is
a **resume**, not a new plan. Go straight to `references/03-resume.md`.

You do not have to grep for it: `blink plan` exits **3** and reports the ids in
`activeRuns`, and prints no dispatch table at all — a plan printed beside a live
run reads as the thing to do next, and it is not.

Otherwise, open `references/01-preflight.md`.

## Tracker writes

Every write to `.blink/` follows `/blink:tracking`, and
`.blink/SCHEMA.md` is the field reference — cite it, never restate it.
Run `blink validate` after each write; zero errors is the bar.
