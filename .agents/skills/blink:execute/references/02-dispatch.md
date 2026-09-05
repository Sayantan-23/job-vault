---
name: blink:execute
blink_version: 0.5.2
description: Dispatch and land — re-read the confirmed run record, dispatch each wave's lanes in one message, hold the barrier between waves, then merge one lane at a time with the gates between each, send red back to the lane that caused it, and record every state change the moment it happens.
---

# Dispatch and land

Two phases on one page. **Dispatch** starts a wave's lanes and waits for that
wave to come back. **Land** merges them, one at a time.

You are here only because the plan was shown, stopped on and confirmed, and the
run record exists. If any of that is not true, go back to
`references/01-preflight.md` — dispatching against an unconfirmed plan is the
one thing that phase exists to prevent.

## Placeholders used on this page

| Placeholder | Substitute |
|---|---|
| `<run>` | the run id `blink run new` printed. Never one you invented |
| `<task>` | a task id the record already covers |
| `<root>` | the absolute path of the job-vault project root — the directory holding `blink.json` |
| `<primary-branch>` | the branch this run lands on. Read it once, in the primary checkout, with `git rev-parse --abbrev-ref HEAD`; never assume `main` or `master` |
| `<path>` | a lane's absolute worktree root, exactly as recorded in `--path` |

## Entry — re-read the record, never recall it

    blink run show <run> --json --project <root>

Read the plan from that command at the top of every wave, **not from what this
conversation remembers.** `show` prints a derived summary — title, status, tier,
gates, one row per lane with its wave and state, the event count and the last
event, the reason if the run is blocked, and any warning the tracker holds
against the run's own file — and never the file body, which is exactly what
makes re-reading it cheap enough to do repeatedly.

A `warning:` line there is about this run and nothing else. The one to stop for
is a task the run names that no task file resolves: the lane table still reads
clean, so the dispatch goes out against work that is not in the tracker.

The reason is the failure this whole skill is built around. A long session gets
summarized; the summary drops a lane path or a gate result; the session keeps
dispatching against a picture that is no longer accurate, while the ledger still
looks maintained. **The record is your memory. Recall is not.**

Before dispatching a wave you need four things from it: `tier`, `gates`, the
lanes at the wave you are about to open, and the states of the wave before it.

## Dispatch — parallel within a wave, a barrier between waves

Work the waves in ascending order. Within a wave, **dispatch every lane in one
message, so they actually run concurrently.** A wave dispatched one agent at a
time is a serial run wearing a wave's clothes: you pay the whole coordination
cost of waves and get none of the parallelism they exist for.

### Per lane, by tier

The tier is the confirmed one and it is in the record. Do not re-decide it here.

| Tier | Worktree | What the lane record carries |
|---|---|---|
| `orchestrators` | one per lane, created by you before dispatch | `--path` and `--branch` |
| `subagents` | none — one checkout, several subagents | neither |
| `inline` | none — this session does the work | neither, but the lane is still recorded |

**`orchestrators`** — create the worktree, then record the lane:

    git worktree add <root>/.claude/worktrees/<task-id> -b lane/<task-id> <primary-branch>

    blink run lane <run> <task> --path <absolute worktree root> \
      --branch lane/<task-id> --state dispatched --project <root>

`--path` takes an **absolute** path. A relative one, read back from a different
working directory — and a resuming session is always in a different working
directory — names a different place, or nothing at all.

**`subagents`** — no worktree, no branch, one checkout:

    blink run lane <run> <task> --state dispatched --project <root>

**`inline`** — this session does the work itself. **Record the lane anyway.**
Resume reads the record and nothing else, so a lane that was never recorded is a
lane that gets redone.

### The run's status is never edited by hand

There is no `blink run start`, because the first dispatch *is* the start. The
first lane that leaves `pending` promotes the run from `planned` to `running`
by itself, and `blink run lane` tells you it happened by printing
`· run → running` at the end of its line.

So: do not open the run file to change `status`, and do not reach for
`blink run finish` to start something — `finish` only ever writes an ending. A
status you set by hand is a status that disagrees with the lanes underneath it,
and every later phase trusts the lanes.

### Worktree setup is yours, not the lane's

A freshly created worktree has no `node_modules` and none of the gitignored
generated files the repository builds. A checkout of the source tree is not a
working development environment, so the lane's very first gate run fails on
setup — and the report that comes back is indistinguishable from a red gate.

Before you dispatch into a new worktree: link or install its dependencies, and
produce whatever generated inputs the gates read.

The rule that follows is the one that gets lost at 2am. **If a lane's gates fail
on a missing dependency or a missing generated file, that is worktree setup, not
the lane's code.** Fix the setup. Do not send it back as a red gate — you will
spend a full round trip to be told, correctly, that the code is fine.

### What goes in a dispatch, and nothing else

Six things:

1. the task id;
2. the task file path — `workSet.tasks[].file` from the plan;
3. the lane path, absolute, and the branch (`orchestrators` only);
4. the gate commands, verbatim, from the run record;
5. the prohibitions below, verbatim;
6. what "ready" means: gates green, primary branch integrated, structured summary
   returned.

**The lane reads its own task file.** Do not paste in the task body, the
milestone, a design document or the conversation so far. Anything you inline is
context you paid for twice — once in your thread and once in theirs — and the
summary you would write of a task file is strictly worse than the file, because
it is shorter in exactly the places you did not know mattered.

### Every dispatch states these prohibitions, in these words

A prohibition that is implied is a prohibition that is ignored. Copy them in.

- **Never write to `.blink/`.** The orchestrator is the sole writer. Two
  writers on one tracker across several worktrees clobber each other, and the
  ledger that a resume depends on stops being trustworthy.
- **Commit with `git add <explicit paths>`, never `git add -A`.** `add -A`
  sweeps up whatever else happens to be in the tree, including another session's
  half-finished work.
- **No AI attribution in commit messages** — no `Co-Authored-By`, no "Generated
  with", no trailers.
- **Work only inside the lane path.** Never edit the primary checkout: that is
  where merges land and where the ledger lives.
- **Integrate `<primary-branch>` before reporting ready.** See "The lane
  integrates first" below; state the rule in the dispatch, not just the branch
  name.
- **Report a structured summary, never a transcript.** A lane's transcript dies
  with the lane; what survives is only what it reports.

### What comes back, and what you do with it

A lane's report is five fields and no prose:

| Field | Why you need it |
|---|---|
| lane path | where the work is, and what you remove afterwards |
| branch | what you merge |
| head sha | pins what "ready" meant — a lane that commits again after reporting is a different thing than the one you agreed to land |
| per-gate pass or fail | the only evidence you have. "All green" without the list is not a report |
| files changed, as paths | tells you which lanes are now likely to conflict. **Paths, never a diff** |

Turn that into exactly two commands, then a commit:

    blink run lane <run> <task> --state ready --project <root>
    blink run event <run> "<task>: gates green on lane/<task-id>" --project <root>

A lane that came back broken is `--state failed` instead of `ready`.

**Commit immediately.** `git add <explicit paths>` for the run record and any
task file you touched, and **never `git add -A`** — this checkout can have
concurrent sessions committing with `add -A`, which sweeps your uncommitted
ledger write into someone else's commit. One write, one `blink validate`, one
commit. Batching writes to the end of the run is how a crash costs the ledger for
every lane at once.

**An event is one line.** Never paste a lane's report into one. `blink run event`
collapses all whitespace into single spaces, so a pasted transcript becomes one
enormous unreadable line that is now in the file permanently — and in the context
of every session that ever reads that run.

### Task status is your write

Following `/blink:tracking`:

- `in_progress` when its lane is dispatched;
- `done` **only** when the lane is merged and the gates are green on
  `<primary-branch>` — never when the lane merely reports success. A lane's own
  green is evidence about the lane, not about the primary branch.

Commit each write immediately, by explicit path, for the same reason as above.

### The barrier

**Wave N+1 does not start until every lane of wave N is `merged`, `failed` or
`skipped`.** `ready` does not clear the barrier: ready means the lane is
waiting to be landed, and landing is the next section.

The reason is where the waves came from. The layout is derived from `blocked_by`,
so a task in wave N+1 declared a dependency on a task in wave N. Starting it early
means building on code that is not there yet: the lane either reimplements it or
writes against an interface that then changes underneath it, and either way you
buy a merge conflict nobody had to have.

Check the barrier with `blink run show <run> --project <root>`, which prints
every lane's state, rather than trusting your recollection of who reported back.

## Land — one lane at a time, gates between each

Merging a whole wave and then running the gates makes one lane's red everyone's
problem: four lanes merged and a failing test tells you something broke and
nothing about what. Serial merge with gates between each keeps failure
attributable to the lane that caused it, and keeps the recovery a single reset.

### The lane integrates first

**This is the load-bearing rule of the entire page.**

Before a lane reports ready it must, inside its own worktree:

    git merge <primary-branch>

resolve every conflict there, re-run its own gates, and only then say ready.

The arithmetic makes it non-optional. Seven lanes branch from one commit. Lane one
merges cleanly. Lane seven merges into a primary that is six merges ahead of where
it started and that it has never seen; conflicts on shared files — a route table,
a nav, a types index, a barrel export — are a certainty at that point rather than
a risk. Resolving a conflict means understanding both sides, which is code work,
landing squarely in the thread that must not do code work — seven times over, at
the end of the run, when your context is thinnest.

The lane holds the context that wrote the code, so it is the only place the
resolution is cheap. And because it integrated, **your merge is trivial by the
time you perform it.**

The corollary is a rule, not a preference: **a lane that reports ready and then
conflicts on merge did not integrate.**

    git merge --abort

Send it back with the conflicting paths and say that plainly — it reported ready
without integrating. **Do not resolve it yourself.** Resolving one conflict "just
this once" is how the restraint dies, and that restraint is the same one that
makes landing nine lanes in a single session possible at all.

### The merge, concretely

Every command below runs in the **primary checkout**, with `<primary-branch>`
checked out — never inside a lane's worktree.

1. **Record where you are.** `git rev-parse HEAD` on `<primary-branch>`, before
   the merge. Keep the sha; it is how you get back.
2. `git merge --no-ff lane/<task-id>` — `--no-ff` so the lane arrives as one
   revertible commit rather than smeared into the primary branch's history.
3. Run the confirmed gate commands **from the run record**, in order, on
   `<primary-branch>`. The record's list — not a remembered one, and not the
   lane's own.

**Green:**

- flip the task to `done`, per `/blink:tracking`;
- `blink run lane <run> <task> --state merged --project <root>`;
- `blink run event <run> "<task> merged · gates green" --project <root>`;
- commit, `git add <explicit paths>`;
- then, and only then, `git worktree remove <path>` followed by
  `git branch -d lane/<task-id>`. `-d`, never `-D`: it refuses to delete a
  branch that is not merged, which is the last guard against throwing the lane
  away.

**Remove a worktree only after its merge is committed.** Removing it first
destroys the work: `git worktree remove` refuses a dirty tree, but a clean tree
whose commits live only on an unmerged branch is exactly as gone once that branch
is deleted too.

**Red:**

    git reset --hard <the sha you recorded>

That is safe here for two specific reasons: the merge is the only thing on top of
that sha, and nothing has been pushed. Both hold precisely because you merge one
lane at a time and record the sha first. Neither holds if you batched.

Then hand the failure back to that lane's sub-orchestrator: the failing command,
its output, and the sha you merged. **You do not patch it.** One patch is one file
read, one diff held in your context, and one more thing your context has to keep —
and that restraint is the entire reason this session is still lean at lane nine.

## Failure states

**A first failure is a re-dispatch, not an ending.** Send the lane back the
failing command and its output, and count the attempt when you do:

    blink run lane <run> <task> --state dispatched --attempts 1 --project <root>

**A lane that fails twice stops, and the wave carries on without it.**

    blink run lane <run> <task> --state failed --attempts 2 --project <root>
    blink run event <run> "<task>: failed twice — <what broke>" --project <root>

Then keep going with the rest of the wave. One dead lane is not a dead run, and
stalling five healthy lanes behind one stuck one converts a small failure into a
total one.

**The run becomes `blocked` only when nothing can proceed** — every remaining
lane depends on the one that died, or the failure is in `<primary-branch>`
itself:

    blink run finish <run> --status blocked --reason "<why>" --project <root>

`--reason` is mandatory and the command refuses without it, because a blocked run
that does not say why cannot be picked up by anyone — including you, tomorrow.

**Never leave a task `in_progress` with nobody working it.** When its lane dies,
the task goes to `blocked` with `blocked_by`, or `paused` with `paused_reason`,
per `/blink:tracking`. `in_progress` means someone is working it right now,
and a lie there survives into every future plan: `blink plan` keeps resolving it
as work in flight, and the next run either skips it forever or dispatches a second
lane over the top of it.

**Ending the run:**

    blink run finish <run> --status done --project <root>
    blink run finish <run> --status abandoned --project <root>

`done` when every lane reached an ending; `abandoned` when the run was called
off. Then report to the user in three lines: what merged, what failed, and what is
left. The record holds the detail — the report gives the shape.

## Do not

- Do not resolve a lane's conflicts yourself. `git merge --abort`, then send it
  back to the lane with the conflicting paths.
- Do not read a lane's implementation diff. Paths changed, never contents.
- Do not paste a lane's transcript into an event, a task file or the conversation.
- Do not batch ledger writes to the end of the run. One write, one commit,
  immediately.
- Do not start a wave before the previous wave's barrier is met.
- Do not remove a worktree, or delete its branch, before the merge is committed.
- Do not edit a run's `status` by hand. Dispatching promotes it; only
  `blink run finish` ends it.
- Do not dispatch a task the record does not cover. `blink run lane` will reject
  it, and it is right to — the run was confirmed over one specific set of tasks.
- Do not run `git add -A`, here or in a lane.

Next, if this session is ever interrupted: `references/03-resume.md`.
