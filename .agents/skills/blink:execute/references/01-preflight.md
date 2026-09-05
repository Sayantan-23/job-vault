---
name: blink:execute
blink_version: 0.5.2
description: Pre-flight — derive the work set, waves, tier and gates from `blink plan --json`, print the plan screen unedited, label every line fact or guess, offer the overrides, stop for explicit confirmation, and only then write the run record with `blink run new`.
---

# Pre-flight — the control surface

This page prints the plan and **stops**. It is the deliverable of the whole
phase, not a formality on the way to dispatching: it is the one moment where a
wrong tier, a wrong wave or a missing gate costs a sentence instead of a run.

Nothing here writes anything until step 6.

## Step 1 — derive, never re-derive

    blink plan <invocation> --json --project <root>

`<invocation>` is what was asked for: task ids (`t-0042 t-0043`), a milestone
id (`m-0bl3lb`), the literal `next`, or nothing at all — which means `next`.
Free text that matches nothing is not an invocation; see exit 1 below.

**The waves, the tier and the overlap guess all come out of this command, and are
never worked out by hand.** The classifier lives inside Blink and is tested
there. A second implementation of it living in a markdown file drifts
from the real one from the day it is written, and the drift shows up as a plan
that no longer matches what `blink plan` prints to the next person.

`blink plan` writes nothing: no run record, no id, no tracker file. Running it
twice is free.

### Exit codes — read the code, then act

| Exit | Means | Do |
|---|---|---|
| `0` | a plan with tasks, ready to confirm | continue to step 2 |
| `1` | handoff: nothing resolved to dispatch | go to `/blink:project`. **Do not invent tasks** — planning is that skill's job, and a task invented here has no agreed scope |
| `2` | the project root could not be read at all | report what it said and stop. A missing or unreadable `blink.json` is not something to work around |
| `3` | a run is already `running` | stop. Go to `references/03-resume.md` and reconcile that run — starting a second run over the same tasks is how two lanes end up writing one file |

Exit 3 beats exit 1: an active run short-circuits the resolve before a fresh plan
is even built, so `activeRuns` is checked before "did anything resolve".

### The JSON fields that matter

| Field | What it settles |
|---|---|
| `next` | `dispatch` \| `handoff` \| `resume` — the same three-way choice as the exit code, named, so you never read a plan by its exit status alone |
| `workSet.tasks[]` | `id`, `title`, `file`, `wave`, `estimate`, `blockedBy` — `file` is the load-bearing one: the dispatch hands that path to the lane and the lane reads the task itself |
| `workSet.excluded` | reached by the invocation but not runnable (`done`, `dropped`). Report these, never silently drop them |
| `workSet.unresolved` | tokens that matched nothing — `unknown_id` (id-shaped, absent here) or `free_text` |
| `classification.tier` | the tier to run: `inline`, `subagents` or `orchestrators` |
| `classification.derived` | the **facts**: `waves`, `edges`, `count`, `maxWidth`, `longLanes`, and its own `label` |
| `classification.inferred` | the **guesses**: `footprints`, `overlaps`, `concurrent`, and its own `label` |
| `classification.reasons[]` | why the tier came out that way; each reason carries its own `basis` of `fact` or `guess` |
| `classification.override` | non-null when something moved the tier: `source` is `instruction` (a `--tier` flag) or `project` (the `orchestration` field in `.blink/project.md`) |
| `gates.gates[]` | the proposed gate commands in run order, each with `command`, `category`, `source`, `detail` |
| `gates.warning` | non-null exactly when nothing but `blink validate` was found. See step 5 |
| `activeRuns` | run ids already `running`. Non-empty means resume |

**Do not dump this JSON into the conversation.** Read the fields you need and
quote those. The payload deliberately carries no task bodies — that projection is
what keeps a nine-task plan from costing nine task files of context — and pasting
the whole object back defeats the only reason it is shaped that way.

## Step 2 — show the screen

    blink plan <invocation> --project <root>

Without `--json` the same plan prints as the pre-flight screen: the run line,
the gate list, the wave table, the excluded and unresolved rows, and the
provenance block.

**Show that output. Do not retype it, summarize it or tidy it up.** A hand-copied
plan and the recorded one differ exactly when it matters — a dropped row, a
renamed task, a gate quietly reordered — and the person confirming is confirming
what they can see.

## Step 3 — fact and guess

This is the most important paragraph on this page.

Both labels come from the plan itself — `classification.derived.label` and
`classification.inferred.label` — so use those words rather than inventing your
own. Today they read `derived from blocked_by` and
`guessed from tags and task bodies`.

- **A fact is derived from declared frontmatter.** The wave layout comes from
  `blocked_by`; the task count and the estimates come from the task files. To
  argue with "4 waves" you **edit `blocked_by` in the task file and re-run
  `blink plan`**. Nothing else will move it — and overriding it in conversation
  leaves the tracker permanently stating something different from what ran.
- **A guess is inferred from tags and task bodies.** The file-overlap heuristic
  reads paths named in a task body plus tags mapped to source roots. To argue
  with "these two touch the same files" you say one sentence. It is free and it
  needs no edit anywhere.

**Render them differently.** Two separately-labelled groups, or a `(fact)` /
`(guess)` marker per line — the plan screen already does this and you should
keep it. If they render the same, people go and fix the wrong thing: they will
argue with a fact in conversation, where it does not stick, and edit frontmatter
to correct a guess, where it did not need to.

## Step 4 — the override menu

Offer these explicitly. Each one has a mechanism, and a mechanism is what makes
an offer real.

| Override | How |
|---|---|
| force a tier | re-run `blink plan <invocation> --tier inline\|subagents\|orchestrators`, so the recorded plan is the one that was seen |
| drop a task | omit its id from `--tasks` on `blink run new` |
| edit the gate list | edit the `--gates` value. The list is a proposal from `blink gates`, never authority |
| move a task between waves | `blink run lane <run> <task> --wave <n>` after the record exists |
| collapse two lanes into one | give both tasks the same wave and dispatch a single lane covering both |
| disable worktrees entirely | `--tier subagents` (one checkout, several subagents) or `--tier inline` (this session does the work) |

**A worktree is filesystem isolation between concurrent writers, not a reward for
related work.** This table gets read backwards constantly. Overlap *within a
wave* is what makes isolation necessary, because a wave runs its lanes at the
same time. Two tasks that touch the same file in different waves never write
concurrently — a wave is a barrier — and genuinely disjoint tasks are cheaper
flat, in one checkout, with no merge tax at all.

## Step 5 — the stop

**Nothing dispatches without explicit confirmation, including when the classifier
is confident.** Confidence is not evidence: the classifier is reading tags and
frontmatter, and a wrong tier costs the whole run rather than one lane.

Prohibited, in these words:

- Do not treat **silence** as confirmation.
- Do not treat "sounds good" about **something else** in the conversation as
  confirmation of this plan.
- Do not treat the **absence of an objection** as confirmation.
- When it is ambiguous, **ask again** rather than assume. One extra question
  costs a line; a wrongly-dispatched run costs every lane in it.

If `gates.warning` is non-null, **put it in the ask itself**, not in a footnote
underneath. A run whose only gate is `blink validate` has verified the tracker's
own frontmatter and nothing whatsoever about the code, and reporting that as
green later is worse than reporting no gates at all — the first reads as
evidence, the second reads as a question. Say so, and offer to add a real gate
before dispatching.

## Step 6 — write the record

On confirmation, and only then:

    blink run new --tasks <ids, confirmed order> --tier <confirmed tier> \
      --gates <confirmed commands> --title "<what this run is>" \
      --lanes <task:wave pairs, confirmed waves> --project <root>

- `--tasks` and `--gates` are comma-separated. Gate commands contain spaces and
  never commas, so `npm run typecheck,npm test` is two gates, not one.
- `--tier` is `inline`, `subagents` or `orchestrators`.
- `--lanes` is the confirmed layout, comma-separated `task:wave` —
  `t-0042:1,t-0043:1,t-0044:2` is two lanes in wave 1 and one in wave 2. Every
  seeded lane is `pending`, because nothing has been dispatched yet.
- It prints **the new run id alone**, so it is usable as
  `RUN=$(blink run new …)`.

The layout goes in that one call rather than a lane at a time: the wave plan the
user just confirmed is **one decision, so it is one write**, and it lands whole
or not at all. Opening the lanes in a loop afterwards meant that a session dying
partway left lane rows that were a prefix of the truth — and on resume a prefix
is indistinguishable from a run that genuinely got that far, so the next phase
would dispatch against a plan nobody approved.

**Never invent a run id, and never run `blink id x` yourself.** The id that
exists is the one `blink run new` printed, because that is the one attached to
the file that was actually written. An id you minted names nothing, and every
later command that takes `<run>` will fail to find it — or worse, a second
session will mint the same shape and the two will read as one run.

### Two rules, with their reasons

1. **The record carries the confirmed plan, not the proposed one.** A task the
   user dropped must not appear in `--tasks`. An edited gate list goes in as
   edited. A forced tier goes in as forced. Every later phase reads the record
   rather than this conversation, so a divergence here is silent for the rest of
   the run and surfaces only as a lane doing something nobody agreed to.
2. **Commit the tracker write immediately.** `git add <explicit paths>`, and
   **never `git add -A`.** This checkout can have concurrent sessions committing
   with `add -A`, which sweeps uncommitted work into someone else's commit;
   batching your ledger writes to the end of the run is how they get lost
   entirely. One write, one `blink validate`, one commit.

## Close

From this moment the record **is** the plan. Everything downstream reads the run
record rather than the conversation — that is what makes a summarized or
restarted session recoverable, and it is why the record has to be right before a
single lane is dispatched.

Next: `references/02-dispatch.md`.

## Do not

- Do not compute waves, a tier or an overlap by hand. `blink plan` owns that.
- Do not paste the `--json` payload into the conversation.
- Do not retype or paraphrase the plan screen.
- Do not dispatch, create a branch, or run `git worktree add` in this phase.
- Do not write anything to `.blink/` before confirmation.
- Do not run `blink run new` twice for one confirmation — the second run record
  is a second plan over the same tasks, and job-vault now has two ledgers
  disagreeing about one piece of work.
