---
name: blink:execute
blink_version: 0.5.2
description: Resume and reconcile — pick a `running` run back up from files alone: read the run record, `blink validate`, `git worktree list` and `git branch --list "lane/*"`, read worktree and branch as two separate signals, print the reconcile report before touching anything, correct the ledger, then re-enter dispatch at the first wave that is not landed.
---

# Resume and reconcile

You are here because a run is already `running`: `blink plan` exited **3** and
named it in `activeRuns`, or `.blink/runs/` holds one.

This page reconstructs what actually happened, says so out loud, corrects the
record, and only then hands back to `references/02-dispatch.md`. It never starts
a second run over the same tasks — two runs over one work set means two lanes
writing one file with nothing anywhere saying they are the same work.

## The governing rule

**Recovery is from files only, never from conversation.**

This holds even when this same session started the run and remembers doing it. A
session that recalls a lane path instead of re-reading it is a session whose
picture has already drifted — the drift is silent, because the recollection is
confident and specific and simply wrong about one field. The whole reason the run
record exists is that it survives a summarization the conversation does not.

So: no lane state, no lane path, no branch name, no gate result comes from
memory. Every one of them is read back from the record or from git, below.

## Placeholders used on this page

| Placeholder | Substitute |
|---|---|
| `<run>` | the run id — from `activeRuns`, or the filename in `.blink/runs/` |
| `<task-id>` | a task id the record covers |
| `<root>` | the absolute path of the job-vault project root — the directory holding `blink.json` |
| `<primary-branch>` | the branch this run lands on. Read it in the primary checkout with `git rev-parse --abbrev-ref HEAD`; never assume `main` or `master` |
| `<path>` | a lane's absolute worktree root, exactly as the record has it in `--path` |

## Step 1 — gather, in this order

Run all four before concluding anything. They are cheap, and a conclusion drawn
from three of them is the one that redoes finished work.

    blink run show <run> --json --project <root>
    blink validate <root>
    git worktree list --porcelain
    git branch --list "lane/*"

| Command | What it contributes |
|---|---|
| `blink run show` | **intent** — which tasks are in this run, which gates were confirmed, which wave each task belongs to, and the state each lane was last recorded in |
| `blink validate` | whether the tracker is even coherent before you act on it. Reconciling against a tracker that does not parse produces confident nonsense |
| `git worktree list --porcelain` | **reality**: which lane worktrees exist on disk right now |
| `git branch --list "lane/*"` | **reality**: which lane branches exist, including branches whose worktree is gone |

`blink run show` prints a **derived summary** — title, status, tier, gates, one
row per lane with its wave and state, the event count and the last event, the
reason if the run is blocked, and any warnings the tracker holds against the
run's own file — and never the file body. That is what makes re-reading it cheap
enough to do at every step rather than holding it in your head.

Read the warnings. A run that names a task with no file left is the case that
matters: the lane table looks fine, and the dispatch goes out against work that
is gone. Fix the tracker or drop the task from the reconcile before dispatching.

If `blink validate` is non-zero, say so and fix the tracker first. If the run's
status is `blocked` rather than `running`, stop here and see "A blocked run does
not auto-resume" below.

## Step 2 — the four readings

**Worktree and branch are two separate signals, and both are required.**

| worktree | branch | reading | do |
|---|---|---|---|
| present | present | lane live | inspect `git log <primary-branch>..lane/<task-id>` and `git status` inside the lane; resume it or discard it |
| absent | present | worktree pruned, **the work survives on the branch** | `git worktree add <path> lane/<task-id>` — **no `-b`**, the branch already exists |
| absent | absent | lane gone entirely | redispatch from scratch: `git worktree add <path> -b lane/<task-id> <primary-branch>` |
| present | absent | corrupt | **report, do not guess** |

`<path>` is the lane's recorded `--path`, not a path you choose. Re-adding a
worktree somewhere else leaves the record naming a directory that does not exist,
which is the same problem one step further along.

### Which lanes this table applies to

**Only a run whose tier is `orchestrators`.** Read `tier` from the record first.

A `subagents` or `inline` lane never had a worktree or a branch, so running this
table over one reads every lane as "lane gone entirely" and redoes the whole run.
For those two tiers, reality is the primary checkout: `git log` and `git status`
there, against the lane states in the record. Everything else on this page —
report first, reality for git facts, gates from the record — applies unchanged.

### Why both signals, stated in full

**Checking only `git worktree list` collapses rows two and three into one.** A
removed worktree does not remove its branch — `git worktree remove` and
`git worktree prune` both leave the branch standing — so a lane read as "gone"
on the worktree signal alone is redispatched from scratch, and a finished lane's
commits sit intact on a branch nobody looks at again.

That is **silent lost work**: the redispatch succeeds, the gates pass, and
nothing anywhere reports that the same task was done twice. There is no red
anywhere in that sequence, which is exactly why the branch check is not optional.

The `-b` distinction between rows two and three follows from the same fact.
`git worktree add <path> lane/<task-id>` checks out a branch that already
exists; `git worktree add <path> -b lane/<task-id> <primary-branch>` creates one.
Using `-b` on row two either fails outright or, if the name was freed in
between, creates a different branch off `<primary-branch>` — and the lane's
actual commits are then orphaned with nothing pointing at them.

### Row four gets its own paragraph

A worktree whose branch has vanished is a state the normal protocol never
produces: this skill deletes a branch only after its merge is committed, and only
after the worktree is removed. So every repair for row four is a guess about what
happened, and a wrong guess destroys work that has no other copy — a detached
worktree may hold the only commits in existence.

**Report it and ask.** Do not remove it, do not re-create the branch, do not
reset anything.

### Resuming a live lane, concretely

Resuming means **re-dispatching into the worktree that is already there** — same
task file, same gates, same prohibitions, per `references/02-dispatch.md`. The
lane re-reads its own task file and reports back the way any lane does. You do
not read its diff to work out how far it got, and you do not finish its work
yourself: that is code work in the thread that must not do code work, and the
lane has the context for it.

Uncommitted changes in `git status` inside a lane belong to that lane. Say they
are there, hand them back with the redispatch, and let the lane commit or discard
them. Never `git checkout`, `git stash` or `git reset` inside someone else's
worktree — uncommitted work has no other copy anywhere.

A worktree you re-added on row two is a **fresh checkout**: no `node_modules`,
none of the gitignored generated files. Redo the worktree setup from
`references/02-dispatch.md` before dispatching into it, or its first gate run
fails on setup and reports as a red gate.

## Step 3 — the record against reality, per lane

For each lane in the record, compare its recorded state to what git says. These
are the mismatches that actually occur:

- recorded `merged`, but `git log <primary-branch>..lane/<task-id>` is **not**
  empty → the merge did not happen, or it happened and was reset after a red
  gate. **An empty range is the proof of a merge; the record alone is not** —
  with the one refinement below, for a lane that never committed at all. Land it
  again, per `references/02-dispatch.md`.
- recorded `dispatched`, but the branch has no commits past its fork point —
  `git log <primary-branch>..lane/<task-id>` empty on a lane that was never
  merged → the lane produced nothing before it died. Redispatch it.
- recorded `pending`, but a worktree exists → it was dispatched and the ledger
  write was lost. That is exactly what a peer session's `git add -A` does to an
  uncommitted tracker file. Adopt reality and record it.
- a task the tracker has at `in_progress` with no lane in the record at all →
  say so. It is either a lane from an older run or a status nobody cleared, and
  both need a human sentence rather than a guess.

An empty range on its own does not separate "merged" from "never committed":
both leave the branch fully contained in `<primary-branch>`. Landing always
creates a `--no-ff` merge commit, so

    git log <primary-branch> --merges --oneline --grep "lane/<task-id>"

finds it. Empty range **plus** that merge commit means merged; empty range with
no merge commit means the lane produced nothing.

### Which source wins

**For git facts, reality wins over the record. For intent, the record wins.**

Reality cannot tell you what was agreed — which tasks are in this run, which
gates count, which wave a task belongs to — and the record cannot tell you what a
branch contains. Ask each source only the question it can answer.

**Gates come from the record, never from re-running `blink gates`.** The run
confirmed a gate list, and verifying the remaining lanes against a freshly
detected one means the run's earlier lanes and its later ones were held to
different standards, with nothing in the record saying so. If the gate list is
genuinely wrong now, say that in the report and get a new list confirmed — do not
quietly substitute one.

## Step 4 — report before touching anything

**Print the reconcile report before any git command that changes anything, and
before any dispatch.** Not after the first fix, not alongside it.

One row per lane, with every column filled in:

| task | recorded state | worktree | branch | reading | intended action |
|---|---|---|---|---|---|

Then three lists:

1. **resuming** — lanes that keep their work;
2. **discarding** — worktrees to remove and branches to delete;
3. **needs a human** — row four, an `in_progress` task with no lane, a failed
   `blink validate`, anything you are guessing about.

The reason is that a resume which starts dispatching before saying what it
concluded **cannot be reviewed** — by the time its conclusion is visible, it has
already acted on it.

And the discards are the irreversible half. `git worktree remove --force` and
`git branch -D` destroy work that exists nowhere else — `-D` deletes an
unmerged branch without complaint, which is precisely the case you are looking
at. So:

- each discard is confirmed **explicitly**, and confirmed **one at a time**;
- never as a sweep, and never bundled into one "clean up the stale lanes?" ask,
  because a single yes then covers a lane nobody looked at.

## Step 5 — record the reconciliation, then re-enter

Correct the ledger to say what you concluded. Per corrected lane:

    blink run lane <run> <task-id> --state <state> --path <absolute worktree root> \
      --branch lane/<task-id> --attempts <n> --project <root>

`--state` is one of `pending`, `dispatched`, `ready`, `merged`, `failed`,
`skipped`. Pass only the fields that changed — the lane already exists, so
`--wave` is not needed and must not be used to move a task between waves during
a reconcile; that is a plan change, not a correction. `--path` is absolute, as
everywhere else in this skill, because a resuming session is always in a
different working directory than the one that wrote it.

Then one line summarizing the reconcile:

    blink run event <run> "reconciled: <n> resuming, <n> redispatched, <n> discarded" --project <root>

Fix the task files in the same pass. A lane you concluded is genuinely merged
whose task is still `in_progress` gets flipped to `done` per
`/blink:tracking`, and a lane you discarded gets its task off `in_progress`
too — `blocked` with `blocked_by`, or `paused` with `paused_reason`. The run
record and the task files are two separate writes, and a reconcile that fixes
only the first leaves `blink plan` resolving that task as work in flight
forever.

**Commit immediately.** `git add <explicit paths>`, and **never `git add -A`**
— same reason as everywhere else in this skill, and doubly so here: a reconcile
whose corrections are swept into a peer session's commit, or lost entirely,
leaves the record wrong in a way the *next* resume will faithfully act on. A
wrong record that nobody corrected is one bad run; a correction that was made and
then lost is the same bad run plus the belief that it was fixed.

Then re-enter `references/02-dispatch.md` at **the first wave that is not fully
landed**, with the barrier rule unchanged: wave N+1 does not start until every
lane of wave N is `merged`, `failed` or `skipped`. A resume does not get to
skip the barrier because the lanes are older.

### A blocked run does not auto-resume

If the run's status is `blocked`, stop and ask, and report the reason with it.
The reason comes from the same command as everything else on this page:
`blink run show <run> --project <root>` prints it as a `blocked:` line, and
`--json` carries it as `blockedReason`. Nothing here opens the run file.

A blocked run stated a reason someone has to answer. Resuming it without an
answer re-runs straight into whatever stopped it, and the second failure is
indistinguishable from the first.

## Do not

- Do not read a lane's state, path or branch from the conversation. Files only,
  including when this session is the one that wrote them.
- Do not trust `git worktree list` alone. Check the branches too, or you will
  redo work that is sitting intact on one.
- Do not run the worktree/branch table over a `subagents` or `inline` run. Those
  lanes never had either, and every one of them reads as gone.
- Do not `git checkout`, `git stash` or `git reset` inside a lane's worktree.
  Uncommitted work there has no other copy.
- Do not run `git worktree prune` before the branch check — it erases the
  evidence that distinguishes rows two and three.
- Do not use `-b` when re-adding a worktree on a branch that still exists.
- Do not delete a branch or force-remove a worktree without explicit
  confirmation, one at a time.
- Do not re-derive the gate list. It comes from the record.
- Do not start a new run over a running one. Reconcile this one.
- Do not dispatch, merge, remove or delete anything before the reconcile report
  is printed.
- Do not run `git add -A`, here or in a lane.
